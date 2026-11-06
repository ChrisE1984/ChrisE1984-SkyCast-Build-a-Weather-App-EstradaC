//---- Plan ----
// On load, look up Stockton.
// On submit, prevent reload, trim the city, reject empty input, and show loading.
// Fetch current weather and forecast together, then draw today's card and five forecast cards.
// If a request fails, clear stale results and show a friendly error.

//---- Elements ----
const BASE_URL = "https://api.openweathermap.org/data/2.5";

const searchForm = document.getElementById("search-form");
const cityInput = document.getElementById("city-input");
const statusMessage = document.getElementById("status");
const todaySection = document.getElementById("today");
const forecastList = document.getElementById("forecast");
const footer = document.getElementById("footer");
const locationButton = document.getElementById("location-button");
const brandWeatherIcon = document.getElementById("brand-weather-icon");

//---- Functions ----
async function getJSON(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Weather request failed with status ${response.status}`);
  }
  return response.json();
}

function createElement(tagname, className, text) {
  const element = document.createElement(tagname);
  element.className = className;
  if (text !== undefined) {
    element.textContent = text;
  }
  return element;
}

function cityDate(timestamp, timezone) {
  return new Date((timestamp + timezone) * 1000);
}

function formatCityTime(timestamp, timezone) {
  return cityDate(timestamp, timezone).toLocaleTimeString("en-US", {
    timeZone: "UTC",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatCityDate(timestamp, timezone, options = {}) {
  return cityDate(timestamp, timezone).toLocaleDateString("en-US", {
    timeZone: "UTC",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    ...options,
  });
}

function groupByDay(list, timezone) {
  return list.reduce((days, item) => {
    const date = cityDate(item.dt, timezone).toISOString().slice(0, 10);
    if (!days[date]) {
      days[date] = [];
    }
    days[date].push(item);
    return days;
  }, {});
}

function showStatus(message, isError = false) {
  statusMessage.textContent = message;
  statusMessage.className = isError ? "error" : "";
}

function renderToday(current, forecastItems) {
  const weather = current.weather[0];
  const city = createElement(
    "p",
    "m-0 text-lg font-bold leading-3 pb-4",
    `${current.name}, ${current.sys.country}`,
  );
  const date = createElement(
    "p",
    "mt-px mb-0 font-bold text-lg leading-3",
    formatCityDate(current.dt, current.timezone, {
      weekday: "long",
      month: "long",
      day: "numeric",
    }),
  );
  const localTime = createElement(
    "p",
    "mt-2 mb-0 text-sm",
    `Local time: ${formatCityTime(Date.now() / 1000, current.timezone)}`,
  );
  const heading = createElement(
    "h2",
    "mt-5 mb0 text-4xl leading-none font-normal",
    `${Math.round(current.main.temp)}°`,
  );
  const description = createElement(
    "p",
    "mt-6 mb-0 text-lg leading-3",
    weather.description,
  );
  const icon = createElement(
    "img",
    "h-24 w-24 shrink-0 object-contain sm:h-32 sm:w-32",
  );
  icon.src = `https://openweathermap.org/img/wn/${weather.icon}@2x.png`;
  icon.alt = weather.description;
  icon.width = 176;
  icon.height = 176;

  const mainContent = createElement(
    "div",
    "flex items-start justify-between gap-4",
  );
  const textContent = createElement("div", "");
  textContent.appendChild(city);
  textContent.appendChild(date);
  textContent.appendChild(localTime);
  textContent.appendChild(heading);
  textContent.appendChild(description);
  mainContent.append(textContent, icon);

  const temperatures = [current.main.temp];
  for (const item of forecastItems) {
    temperatures.push(item.main.temp_max);
    temperatures.push(item.main.temp_min);
  }

  const high = Math.round(Math.max(...temperatures));
  const low = Math.round(Math.min(...temperatures));

  const details = createElement(
    "div",
    "mt-7 grid max-w-xs grid-cols-2 gap-2 sm:mt-8 sm:max-w-sm sm:grid-cols-4 sm:gap-x-3 sm:gap-y-3",
  );

  const metrics = [
    ["Feels like", `${Math.round(current.main.feels_like)}°`],
    ["Humidity", `${current.main.humidity}%`],
    ["Wind", `${Math.round(current.wind.speed)} mph`],
    ["Today’s range", `${high}° / ${low}°`],
    ["Sunrise", formatCityTime(current.sys.sunrise, current.timezone)],
    ["Sunset", formatCityTime(current.sys.sunset, current.timezone)],
  ];

  for (const [label, value] of metrics) {
    const metric = createElement(
      "div",
      "min-h-8 rounded bg-gradient-to-b from-slate-200 to-blue-300 px-1 py-1",
    );
    metric.appendChild(
      createElement("p", "m-0 text-xs leading-3 text-slate-600", label),
    );
    metric.appendChild(createElement("p", "m-0 text-xs font-bold", value));
    details.appendChild(metric);
  }

  const card = createElement(
    "article",
    "relative flex flex-col rounded bg-gradient-to-b from-blue-200 to-blue-400 px-4 py-3 sm:px-7 sm:py-5",
  );
  card.appendChild(mainContent);
  card.appendChild(details);
  todaySection.replaceChildren(card);
}

function renderForecast(days, timezone, today) {
  forecastList.replaceChildren();
  const dates = [];
  for (const date in days) {
    if (date >= today) {
      dates.push(date);
    }
  }
  dates.sort();
  dates.splice(5);

  for (const date of dates) {
    const items = days[date];
    const middayReading = items.reduce((closest, item) => {
      const localhour = cityDate(item.dt, timezone).getUTCHours();
      const closestHour = cityDate(closest.dt, timezone).getUTCHours();
      return Math.abs(localhour - 12) < Math.abs(closestHour - 12)
        ? item
        : closest;
    });
    const weather = middayReading.weather[0];
    const forecastDay = {
      weekday: formatDateLabel(date, { weekday: "short" }),
      date: formatDateLabel(date, { month: "short", day: "numeric" }),
      icon: weather.icon,
      description: weather.description,
      high: Math.round(Math.max(...items.map((item) => item.main.temp_max))),
      low: Math.round(Math.min(...items.map((item) => item.main.temp_min))),
    };
    const card = createElement(
      "li",
      "min-h-40 rounded bg-gradient-to-b from-blue-50 to-blue-300 px-1 pt-2 pb-2 text-center last:col-span-full sm:last:col-span-1",
    );
    const weekday = createElement(
      "p",
      "m-0 text-xs leading-4",
      forecastDay.weekday,
    );
    const dateLabel = createElement(
      "p",
      "mt-1 mb-0 text-xs leading-3 text-slate-500",
      forecastDay.date,
    );
    const icon = createElement(
      "img",
      "mx-auto mt-5 mb-2 block h-14 w-14 object-contain",
    );
    icon.src = `https://openweathermap.org/img/wn/${forecastDay.icon}@2x.png`;
    icon.alt = forecastDay.description;
    icon.width = 52;
    icon.height = 52;
    const description = createElement(
      "p",
      "m-0 min-h-3 whitespace-nowrap text-xs leading-3 text-slate-500",
      forecastDay.description,
    );
    const temperatures = createElement(
      "p",
      "mt-3 mb-0 text-xs leading-4 font-bold",
      `${forecastDay.high}° / `,
    );
    temperatures.appendChild(
      createElement("span", "font-bold text-slate-950", `${forecastDay.low}°`),
    );
    card.append(weekday, dateLabel, icon, description, temperatures);
    forecastList.appendChild(card);
  }
}
function formatDateLabel(date, options) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
    timeZone: "UTC",
    ...options,
  });
}

function handleWeatherData([current, forecast], successMessage = "") {
  const groupedForecast = groupByDay(forecast.list, current.timezone);
  const currentWeather = current.weather[0];
  brandWeatherIcon.src = `https://openweathermap.org/img/wn/${currentWeather.icon}@2x.png`;
  brandWeatherIcon.alt = currentWeather.description;
  const today = cityDate(current.dt, current.timezone)
    .toISOString()
    .slice(0, 10);
  renderToday(current, groupedForecast[today] || []);
  renderForecast(groupedForecast, current.timezone, today);
  footer.textContent = `Data from OpenWeather · Last updated ${formatCityTime(
    current.dt,
    current.timezone,
  )}`;
  showStatus(successMessage);
}

function handleWeatherError(error) {
  console.error("Weather lookup failed:", error);
  showStatus(
    error instanceof Error && error.message.includes("status 404")
      ? "We couldn’t find that city. Check the spelling and try again."
      : "Weather is unavailable right now. Please check your connection and try again.",
    true,
  );
}

function loadWeather(query, successMessage = "") {
  todaySection.replaceChildren();
  forecastList.replaceChildren();

  showStatus("Loading…");
  const params = { ...query, units: "imperial", appid: API_KEY };
  const parameters = new URLSearchParams(params).toString();
  return Promise.all([
    getJSON(`${BASE_URL}/weather?${parameters}`),
    getJSON(`${BASE_URL}/forecast?${parameters}`),
  ]).then(
    (data) => handleWeatherData(data, successMessage),
    handleWeatherError,
  );
}

function searchWeather(city, state) {
  const trimmedCity = city.trim();
  if (!trimmedCity) {
    showStatus("Type a city first 🙂", true);
    return;
  }

  return loadWeather({ q: `${trimmedCity}, ${state}` });
}

function handleLocationError(error) {
  console.error("Location lookup failed:", error.message);
  showStatus(
    error.code === 1
      ? "You blocked location access. Please allow it and try again."
      : "We could not get your location. Please try again.",
    true,
  );
}

function getWeatherForLocation(position) {
  const { latitude, longitude } = position.coords;
  const query = {
    lat: latitude,
    lon: longitude,
  };
  const coordinates = `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`;
  return loadWeather(query, `Found you: ${coordinates}`);
}

//---- Event Listeners ----

searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  searchWeather(cityInput.value);
});

locationButton.addEventListener("click", () => {
  if (!navigator.geolocation) {
    showStatus("Location is not supported by this browser.", true);
    return;
  }

  showStatus("Finding you…");
  navigator.geolocation.getCurrentPosition(
    getWeatherForLocation,
    handleLocationError,
  );
});

//---- On Load ----
searchWeather("Stockton");
