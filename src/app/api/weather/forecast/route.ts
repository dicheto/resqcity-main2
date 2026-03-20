import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY || process.env.NEXT_PUBLIC_OPENWEATHER_KEY;
const OPENWEATHER_BASE = 'https://api.openweathermap.org/data/2.5';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = searchParams.get('lat');
    const lon = searchParams.get('lon');

    if (!lat || !lon) {
      return NextResponse.json(
        { success: false, error: 'Latitude and longitude are required' },
        { status: 400 }
      );
    }

    if (!OPENWEATHER_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'OPENWEATHER_API_KEY is not configured. Real weather data required.' },
        { status: 503 }
      );
    }

    // Fetch current weather and 5-day forecast
    const [currentWeather, forecast] = await Promise.all([
      axios.get(`${OPENWEATHER_BASE}/weather`, {
        params: {
          lat,
          lon,
          appid: OPENWEATHER_API_KEY,
          units: 'metric',
          lang: 'bg',
        },
        timeout: 5000,
      }),
      axios.get(`${OPENWEATHER_BASE}/forecast`, {
        params: {
          lat,
          lon,
          appid: OPENWEATHER_API_KEY,
          units: 'metric',
          lang: 'bg',
        },
        timeout: 5000,
      }),
    ]);

    const current = currentWeather.data;
    const forecastData = forecast.data;

    // Process forecast to get daily min/max
    const dailyForecasts = new Map<string, { temps: number[]; weather: any[] }>();
    
    forecastData.list.forEach((item: any) => {
      const date = new Date(item.dt * 1000).toLocaleDateString('bg-BG');
      if (!dailyForecasts.has(date)) {
        dailyForecasts.set(date, { temps: [], weather: [] });
      }
      dailyForecasts.get(date)!.temps.push(item.main.temp);
      dailyForecasts.get(date)!.weather.push(item.weather[0]);
    });

    const daily = Array.from(dailyForecasts.entries()).slice(0, 5).map(([date, data]) => ({
      date,
      temp_min: Math.round(Math.min(...data.temps)),
      temp_max: Math.round(Math.max(...data.temps)),
      weather: data.weather[0],
    }));

    return NextResponse.json({
      success: true,
      data: {
        current: {
          temp: Math.round(current.main.temp),
          feels_like: Math.round(current.main.feels_like),
          temp_min: Math.round(current.main.temp_min),
          temp_max: Math.round(current.main.temp_max),
          humidity: current.main.humidity,
          pressure: current.main.pressure,
          wind_speed: current.wind.speed,
          wind_deg: current.wind.deg,
          clouds: current.clouds.all,
          visibility: current.visibility,
          sunrise: current.sys.sunrise,
          sunset: current.sys.sunset,
          weather: {
            id: current.weather[0].id,
            main: current.weather[0].main,
            description: current.weather[0].description,
            icon: current.weather[0].icon,
          },
          city_name: current.name,
        },
        daily,
      },
    });
  } catch (error: any) {
    console.error('Error fetching weather forecast:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch weather forecast', message: error.message },
      { status: 500 }
    );
  }
}
