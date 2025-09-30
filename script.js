// script.js
document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const elements = {
        searchBtn: document.getElementById('search-btn'),
        cityInput: document.getElementById('city-input'),
        weatherData: document.getElementById('weather-data'),
        loading: document.getElementById('loading'),
        error: document.getElementById('error'),
        errorMsg: document.querySelector('.error-msg'),
        cityName: document.getElementById('city-name'),
        temp: document.getElementById('temp'),
        feelsLike: document.getElementById('feels-like'),
        precipitation: document.getElementById('precipitation'),
        wind: document.getElementById('wind'),
        humidity: document.getElementById('humidity'),
        conditionIcon: document.getElementById('condition-icon'),
        conditionText: document.getElementById('condition-text'),
        aqiValue: document.getElementById('aqi-value'),
        aqiText: document.getElementById('aqi-text'),
        aqiBar: document.getElementById('aqi-bar'),
        uvValue: document.getElementById('uv-value'),
        uvBar: document.getElementById('uv-bar'),
        uvRisk: document.getElementById('uv-risk'),
        clothingTip: document.getElementById('clothing-tip')
    };

    // Weather Code Mappings
    const weatherCodes = {
        0: { icon: 'wi-day-sunny', text: 'Clear sky' },
        1: { icon: 'wi-day-cloudy', text: 'Mostly clear' },
        2: { icon: 'wi-cloud', text: 'Partly cloudy' },
        // ... (keep your existing weather codes)
    };

    // Initialize GSAP animations
    gsap.from('.title', { y: -50, opacity: 0, duration: 1, delay: 0.3 });
    gsap.from('.search-box', { x: -50, opacity: 0, duration: 0.8, delay: 0.5 });

    // Event Listeners
    elements.searchBtn.addEventListener('click', handleSearch);
    elements.cityInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearch();
    });

    async function handleSearch() {
        const city = elements.cityInput.value.trim();
        if (!city) {
            showError('Please enter a city name');
            return;
        }
        
        try {
            startLoading();
            const coords = await getCoordinates(city);
            const weather = await getWeatherData(coords);
            updateUI(weather, coords.name);
        } catch (err) {
            showError(err.message);
        }
    }

    async function getCoordinates(city) {
        try {
            const response = await fetch(
                `https://geocoding-api.open-meteo.com/v1/search?name=${city}&count=1`
            );
            const data = await response.json();
            
            if (!data?.results?.[0]) {
                throw new Error('City not found!');
            }
            
            return {
                lat: data.results[0].latitude,
                lon: data.results[0].longitude,
                name: data.results[0].name
            };
        } catch (err) {
            throw new Error('Failed to get location data');
        }
    }

    async function getWeatherData({ lat, lon }) {
        try {
            // Fetch weather data
            const weatherResponse = await fetch(
                `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,precipitation,wind_speed_10m,relative_humidity_2m,weather_code,uv_index&hourly=relative_humidity_2m&daily=uv_index_max&timezone=auto`
            );
            
            // Fetch air quality data separately
            const aqiResponse = await fetch(
                `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&hourly=pm2_5`
            );
    
            const weatherData = await weatherResponse.json();
            const aqiData = await aqiResponse.json();
    
            return {
                current: weatherData.current || {},
                aqi: aqiData.hourly?.pm2_5?.[0] || 'N/A',
                daily: weatherData.daily || { uv_index_max: [0] }
            };
        } catch (err) {
            throw new Error('Failed to fetch weather data');
        }
    }
    function updateUI(weather, cityName) {
    // Current weather data
    const { current } = weather;
    const pm25 = weather.aqi;
    const uvIndex = current.uv_index ?? 0;

        // Update basic info
        elements.cityName.textContent = cityName;
        elements.temp.textContent = `${current.temperature_2m ?? '--'}°C`;
        elements.feelsLike.textContent = `Feels like ${calculateFeelsLike(current)}°C`;
        elements.precipitation.textContent = `${current.precipitation ?? '--'}mm`;
        elements.wind.textContent = `${current.wind_speed_10m ?? '--'} km/h`;
        elements.humidity.textContent = `${current.relative_humidity_2m ?? '--'}%`;

        // Weather condition
        const weatherCode = current.weather_code ?? 0;
        const condition = weatherCodes[weatherCode] || { icon: 'wi-alien', text: 'Unknown' };
        elements.conditionIcon.className = `wi ${condition.icon} pulse`;
        elements.conditionText.textContent = condition.text;

        // AQI
        updateAQI(pm25);
        
        // UV Index
        updateUV(uvIndex);

        // Clothing recommendation
        elements.clothingTip.textContent = getClothingRecommendation(
            current.temperature_2m,
            weatherCode
        );

        // Animate in
        finishLoading();
    }

    function calculateFeelsLike(current) {
        return Math.round(
            (current.temperature_2m || 0) + 
            (current.wind_speed_10m * 0.1 || 0) - 
            (current.relative_humidity_2m * 0.05 || 0)
        );
    }

    function updateAQI(pm25) {
        elements.aqiValue.textContent = pm25;
        
        if (pm25 === 'N/A') {
            elements.aqiText.textContent = 'Data unavailable';
            elements.aqiBar.style.display = 'none';
            return;
        }

        elements.aqiBar.style.display = 'block';
        const width = Math.min(pm25, 100);
        elements.aqiBar.style.width = `${width}%`;
        
        if (pm25 <= 12) {
            elements.aqiText.textContent = 'Good 😊';
            elements.aqiBar.style.background = '#00e676';
        } else if (pm25 <= 35) {
            elements.aqiText.textContent = 'Moderate 😐';
            elements.aqiBar.style.background = '#ffd600';
        } else {
            elements.aqiText.textContent = 'Unhealthy 😷';
            elements.aqiBar.style.background = '#ff5252';
        }
    }

    function updateUV(uvIndex) {
        elements.uvValue.textContent = uvIndex;
        elements.uvBar.style.width = `${Math.min(uvIndex * 10, 100)}%`;
        
        if (uvIndex <= 2) {
            elements.uvRisk.textContent = 'Low';
            elements.uvRisk.style.background = '#00e676';
        } else if (uvIndex <= 5) {
            elements.uvRisk.textContent = 'Moderate';
            elements.uvRisk.style.background = '#ffd600';
        } else {
            elements.uvRisk.textContent = 'High';
            elements.uvRisk.style.background = '#ff5252';
        }
    }

    function getClothingRecommendation(temp, weatherCode) {
        let recommendation = '';
        temp = temp || 20; // Default to 20°C if undefined
        
        if (temp > 30) recommendation = 'Light clothing and sunscreen';
        else if (temp > 20) recommendation = 'T-shirts and shorts weather';
        else if (temp > 10) recommendation = 'Light jacket recommended';
        else recommendation = 'Bundle up! Wear warm layers';

        if ([61, 63, 65, 80, 81, 82].includes(weatherCode)) {
            recommendation += ' • Bring an umbrella! ☔';
        }
        if ([71, 73, 75].includes(weatherCode)) {
            recommendation += ' • Wear waterproof boots!';
        }

        return recommendation;
    }

    function startLoading() {
        elements.error.classList.add('hidden');
        elements.weatherData.classList.add('hidden');
        elements.loading.classList.remove('hidden');
        gsap.to(elements.weatherData, { opacity: 0, duration: 0.3 });
    }

    function finishLoading() {
        elements.loading.classList.add('hidden');
        elements.weatherData.classList.remove('hidden');
        gsap.to(elements.weatherData, { 
            opacity: 1, 
            duration: 0.5,
            onStart: () => elements.weatherData.classList.remove('hidden')
        });
    }

    function showError(message) {
        elements.loading.classList.add('hidden');
        elements.errorMsg.textContent = message;
        elements.error.classList.remove('hidden');
        gsap.from(elements.error, { scale: 0.8, opacity: 0, duration: 0.3 });
    }

});