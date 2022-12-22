
const API_KEY = "c4cf8098f55f86c1147943c82422db1f";

const DAYS_OF_WEEK = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

let selectedCityText;
let selectedCity;

const getCities =async (searchText) => {
    const response=await fetch(`https://api.openweathermap.org/geo/1.0/direct?q=${searchText}&limit=5&appid=${API_KEY}`)
    return response.json();
}


const getCurrentWeatherData = async ({lat,lon,name:city}) => {
    const url =
      lat && lon
        ? `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`
        : `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}&units=metric`;
    const response = await fetch(url);
    return response.json();
}

const getHourlyForecast = async ({name: city}) => {
    const response = await fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${API_KEY}&units=metric`);
    const data = await response.json();
    return data.list.map(forecast => {
        const { main: { temp, temp_max, temp_min }, dt_txt, weather: [{ description, icon }] } = forecast;
        return { temp, temp_max, temp_min, dt_txt, description, icon };
    })
}

const formatTemperature = (temp) => `${temp?.toFixed(1)}°`;
const createIconUrl=(icon)=>`https://openweathermap.org/img/wn/${icon}@2x.png`

const loadCurrentForecast = ({ name, main: { temp, temp_max, temp_min }, weather: [{ description }] }) => {
    const currentForecastElement = document.querySelector("#current-forecast");
    currentForecastElement.querySelector(".city").textContent = name;
    currentForecastElement.querySelector(".temp").textContent = formatTemperature(temp);
    currentForecastElement.querySelector(".description").textContent = description;
    currentForecastElement.querySelector(".min-max-temp").textContent = `H: ${formatTemperature(temp_max)}  L: ${formatTemperature(temp_min)}`;
}

const loadHourlyForecast = ({main:{temp: tempNow},weather:[{icon: iconNow}]},hourlyForecast) => {
    // console.log(hourlyForecast);

    const timeFormatter = Intl.DateTimeFormat("en", {
        hour12: true, hour: "numeric",
    })

    let dataFor12Hours = hourlyForecast.slice(2, 14);
    const hourlyContainer = document.querySelector(".hourly-container");
    let innerHTMLString = `<article>
            <h3 class="time">Now</h3>
            <img class="icon" src="${createIconUrl(iconNow)}"/>
            <p class="hourly-temp">${formatTemperature(tempNow)}</p>
          </article>`;
    for (let { temp, icon, dt_txt } of dataFor12Hours) {
        innerHTMLString += ` <article>
            <h3 class="time">${timeFormatter.format(new Date(dt_txt))}</h3>
            <img class="icon" src="${createIconUrl(icon)}"/>
            <p class="hourly-temp">${formatTemperature(temp)}</p>
          </article>`;
    }
    hourlyContainer.innerHTML = innerHTMLString;
}

const calculateDayWiseForecast = (hourlyForecast) => {
    let dayWiseForecast = new Map();
    for (let forecast of hourlyForecast) {
        const [date] = forecast.dt_txt.split(" ");
        const dayOfWeek = DAYS_OF_WEEK[new Date(date).getDay()];
        if (dayWiseForecast.has(dayOfWeek)) {
            let forecastForTheDay = dayWiseForecast.get(dayOfWeek);
            forecastForTheDay.push(forecast);
            dayWiseForecast.set(dayOfWeek, forecastForTheDay);
        }
        else {
            dayWiseForecast.set(dayOfWeek, [forecast]);
        }
    }
    // console.log(dayWiseForecast);

    for (let [key, value] of dayWiseForecast) {
        let temp_min = Math.min(...Array.from(value, val => val.temp_min));
        let temp_max = Math.max(...Array.from(value, val => val.temp_max));

        dayWiseForecast.set(key, { temp_min, temp_max, icon: value.find(v => v.icon).icon });
    }
    // console.log(dayWiseForecast);
    return dayWiseForecast;

}

const loadFiveDayForecast = (hourlyForecast) => {
    // console.log(hourlyForecast);
    const dayWiseForecast = calculateDayWiseForecast(hourlyForecast);
    const container = document.querySelector(".five-day-forecast-container");
    let dayWiseInfo = "";
    Array.from(dayWiseForecast).map(([day, { temp_max, temp_min, icon }], index) => {

        if (index < 5) {
            dayWiseInfo += ` <article class="day-wise-forecast">
            <h3 class="day">${index === 0 ? "today" : day}</h3>
            <img class="icon" src="${createIconUrl(icon)}" alt="icon for the forecast">
            <p class="min-temp">${formatTemperature(temp_min)}</p>
            <p class="max-temp">${formatTemperature(temp_max)}</p>
          </article>`;
        }
    })
    container.innerHTML = dayWiseInfo;
}

const loadFeelsLike = ({main:{feels_like}}) => {
    const feelslike = document.querySelector("#feels-like");
    feelslike.querySelector(".feels-like-temp").textContent = formatTemperature(feels_like);
}

const loadHumidity = ({ main: { humidity } }) => {
    const humidityValue = document.querySelector("#humidity");
    humidityValue.querySelector(".humidity-temp").textContent=`${humidity}%`
}

const loadForecastUsingGeoLocation = ()=>{
    navigator.geolocation.getCurrentPosition(({ coords }) => {
        const { latitude: lat, longitde: lon } = coords;
        selectedCity = { lat, lon };
        loadData();
    },error=>console.log(error));
}


const loadData = async() => {
    
     const currentWeather =await getCurrentWeatherData(selectedCity);
    loadCurrentForecast(currentWeather);
    const hourlyForecast=await getHourlyForecast(currentWeather);
    loadHourlyForecast(currentWeather,hourlyForecast);
    loadFiveDayForecast(hourlyForecast);
    loadFeelsLike(currentWeather);
    loadHumidity(currentWeather);

}

function debounce(func) {
    let timer;
    return (...args) => {
        clearTimeout(timer);// clearing existing timeout
        //set a new timeout as user is typing
        timer=setTimeout(() => {
           func.apply(this,args) 
        },500);
    }
}

const onSearchChange = async (event) => {
    let { value } = event.target;

    if (!value) {
        selectedCityText = null;
        selectedCity = "";
    }
    
    if (value && (selectedCityText !== value)) {
        const listOfCities=await getCities(value);
        let options = "";
    
        for (let {lat, lon, name, state, country } of listOfCities) {
            options += `<option data-city-details='${JSON.stringify({lat,lon,name})}' value="${name}, ${state}, ${country}"></option>`;
        }
        document.querySelector("#cities").innerHTML = options;
    
    }

    // console.log(listOfCities);
}

const handleCitySelection = (event) => {
    selectedCityText=event.target.value;
    let options = document.querySelectorAll("#cities > option");
    // console.log(options);
    if (options?.length) {
        let selectedOption = Array.from(options).find(opt => opt.value === selectedCityText);
        selectedCity = JSON.parse(selectedOption.getAttribute("data-city-details"));
        console.log(selectedCity);
        loadData();
    }
}

const debounceSearch = debounce((event)=> onSearchChange(event));

document.addEventListener("DOMContentLoaded", async () => {
    loadForecastUsingGeoLocation();
    const searchInput = document.querySelector("#search");
    searchInput.addEventListener("input", debounceSearch);
    searchInput.addEventListener("change", handleCitySelection);

   
})