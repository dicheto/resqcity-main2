import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

const OPENWEATHER_API_KEY = process.env.NEXT_PUBLIC_OPENWEATHER_KEY;
const OPENWEATHER_BASE = 'https://api.openweathermap.org/data/2.5';

interface WeatherGridPoint {
  lat: number;
  lon: number;
  temp: number;
  feels_like: number;
  humidity: number;
  pressure: number;
  wind_speed: number;
  wind_deg: number;
  clouds: number;
  weather: {
    id: number;
    main: string;
    description: string;
    icon: string;
  };
  city_name?: string;
}

// Major Bulgarian cities for weather grid (reduced for API limits)
const BULGARIAN_CITIES = [
  { name: 'София', lat: 42.6977, lon: 23.3219 },
  { name: 'Пловдив', lat: 42.1354, lon: 24.7453 },
  { name: 'Варна', lat: 43.2141, lon: 27.9147 },
  { name: 'Бургас', lat: 42.5047, lon: 27.4626 },
  { name: 'Русе', lat: 43.8356, lon: 25.9657 },
  { name: 'Стара Загора', lat: 42.4258, lon: 25.6345 },
  { name: 'Плевен', lat: 43.4081, lon: 24.6067 },
  { name: 'Велико Търново', lat: 43.0757, lon: 25.6172 },
  { name: 'Благоевград', lat: 42.0116, lon: 23.0905 },
  { name: 'Перник', lat: 42.6042, lon: 23.0309 },
  { name: 'Хасково', lat: 41.9344, lon: 25.5557 },
  { name: 'Пазарджик', lat: 42.1887, lon: 24.3332 },
  { name: 'Ямбол', lat: 42.4870, lon: 26.5036 },
  { name: 'Кърджали', lat: 41.6353, lon: 25.3678 },
  { name: 'Силистра', lat: 44.1167, lon: 27.2667 },
  { name: 'Добрич', lat: 43.5667, lon: 27.8333 },
  { name: 'Шумен', lat: 43.2706, lon: 26.9225 },
  { name: 'Смолян', lat: 41.5771, lon: 24.7011 },
  { name: 'Видин', lat: 43.9859, lon: 22.8719 },
  { name: 'Монтана', lat: 43.4092, lon: 23.2256 },
];

// Cache for weather data
let weatherCache: { data: WeatherGridPoint[]; timestamp: number } | null = null;
const CACHE_TTL = 600000; // 10 minutes

export async function GET(request: NextRequest) {
  try {
    // Check cache
    const now = Date.now();
    if (weatherCache && now - weatherCache.timestamp < CACHE_TTL) {
      return NextResponse.json({
        success: true,
        data: weatherCache.data,
        cached: true,
      });
    }

    // Fetch weather for all cities in parallel with longer timeout
    const weatherPromises = BULGARIAN_CITIES.map(async (city) => {
      try {
         if (!OPENWEATHER_API_KEY) {
           console.warn('⚠️ NEXT_PUBLIC_OPENWEATHER_KEY не е конфигуриран. Използват се mock данни.');
           // Return mock data for demo
           return {
             lat: city.lat,
             lon: city.lon,
             temp: Math.round(18 + Math.random() * 12),
             feels_like: Math.round(17 + Math.random() * 11),
             humidity: Math.round(50 + Math.random() * 30),
             pressure: Math.round(1010 + Math.random() * 20),
             wind_speed: Math.round(Math.random() * 10),
             wind_deg: Math.round(Math.random() * 360),
             clouds: Math.round(Math.random() * 100),
             weather: {
               id: 801,
               main: 'Clouds',
               description: 'малко облачно',
               icon: '02d',
             },
             city_name: city.name,
           };
         }
        const response = await axios.get(`${OPENWEATHER_BASE}/weather`, {
          params: {
            lat: city.lat,
            lon: city.lon,
            appid: OPENWEATHER_API_KEY,
            units: 'metric',
            lang: 'bg',
          },
          timeout: 10000,
        });

        const data = response.data;
        return {
          lat: city.lat,
          lon: city.lon,
          temp: Math.round(data.main.temp),
          feels_like: Math.round(data.main.feels_like),
          humidity: data.main.humidity,
          pressure: data.main.pressure,
          wind_speed: data.wind.speed,
          wind_deg: data.wind.deg,
          clouds: data.clouds.all,
          weather: {
            id: data.weather[0].id,
            main: data.weather[0].main,
            description: data.weather[0].description,
            icon: data.weather[0].icon,
          },
          city_name: city.name,
        };
      } catch (error) {
        console.error(`Error fetching weather for ${city.name}:`, error);
        return null;
      }
    });

    const results = await Promise.all(weatherPromises);
    const validResults = results.filter(Boolean) as WeatherGridPoint[];

    // If no results, return cached data or error
    if (validResults.length === 0) {
      if (weatherCache) {
        return NextResponse.json({
          success: true,
          data: weatherCache.data,
          cached: true,
          warning: 'Using cached data due to API timeout',
        });
      }
      
      return NextResponse.json(
        { success: false, error: 'Failed to fetch weather data from all cities' },
        { status: 503 }
      );
    }

    // Cache the results
    weatherCache = {
      data: validResults,
      timestamp: now,
    };

    console.log(`✅ Weather grid: ${validResults.length}/${BULGARIAN_CITIES.length} cities fetched`);

    return NextResponse.json({
      success: true,
      data: validResults,
      cached: false,
    });
  } catch (error: any) {
    console.error('Error fetching weather grid:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch weather data', message: error.message },
      { status: 500 }
    );
  }
}
