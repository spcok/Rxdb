export interface WeatherCurrent {
  temperature: number;
  weatherCode: number;
  description: string;
  windSpeed: number;
  windDirection: number;
  windGust: number;
}

export interface WeatherDaily {
  date: string;
  weatherCode: number;
  maxTemp: number;
  minTemp: number;
}

export interface WeatherHourly {
  time: string;
  weatherCode: number;
  description: string;
  temp: number;
  windSpeed: number;
  windDirection: number;
  windGust: number;
  precipProb: number;
}

export interface FullWeatherData {
  current: WeatherCurrent;
  daily: WeatherDaily[];
  hourly: WeatherHourly[];
}

const getWmoDescription = (code: number): string => {
  if (code === 0) return 'Clear sky';
  if (code >= 1 && code <= 3) return 'Cloudy';
  if (code >= 45 && code <= 48) return 'Fog';
  if (code >= 51 && code <= 67) return 'Rain';
  if (code >= 71 && code <= 77) return 'Snow';
  if (code >= 95 && code <= 99) return 'Thunderstorm';
  return 'Unknown';
};

export const getFullWeather = async (address: string = 'Maidstone, Kent, UK'): Promise<FullWeatherData> => {
  let lat = 51.27;
  let lon = 0.52;

  try {
    const query = address.split(',')[0].trim();
    const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1`);
    const geoData = await geoRes.json();
    if (geoData.results && geoData.results.length > 0) {
      lat = geoData.results[0].latitude;
      lon = geoData.results[0].longitude;
    }
  } catch (e) {
    console.error('Geocoding failed, using fallback', e);
  }

  const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m&hourly=temperature_2m,precipitation_probability,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`);
  const data = await weatherRes.json();

  const current: WeatherCurrent = {
    temperature: data.current.temperature_2m,
    weatherCode: data.current.weather_code,
    description: getWmoDescription(data.current.weather_code),
    windSpeed: data.current.wind_speed_10m,
    windDirection: data.current.wind_direction_10m,
    windGust: data.current.wind_gusts_10m,
  };

  const daily: WeatherDaily[] = data.daily.time.map((time: string, i: number) => ({
    date: time,
    weatherCode: data.daily.weather_code[i],
    maxTemp: data.daily.temperature_2m_max[i],
    minTemp: data.daily.temperature_2m_min[i],
  }));

  const hourly: WeatherHourly[] = data.hourly.time.map((time: string, i: number) => ({
    time,
    weatherCode: data.hourly.weather_code[i],
    description: getWmoDescription(data.hourly.weather_code[i]),
    temp: data.hourly.temperature_2m[i],
    windSpeed: data.hourly.wind_speed_10m[i],
    windDirection: data.hourly.wind_direction_10m[i],
    windGust: data.hourly.wind_gusts_10m[i],
    precipProb: data.hourly.precipitation_probability[i],
  }));

  return { current, daily, hourly };
};

export const getMaidstoneDailyWeather = async () => {
  const data = await getFullWeather('Maidstone, Kent, UK'); 
  // Extract 13:00 specific hour
  const todayPrefix = new Date().toISOString().split('T')[0];
  const targetTime = `${todayPrefix}T13:00`;
  const hourly1300 = data.hourly?.find((h: WeatherHourly) => h.time === targetTime) || data.hourly?.[13];
  
  // Extract daily max/min
  const maxTemp = data.daily?.[0]?.maxTemp ?? Math.round(data.current.temperature + 2);
  const minTemp = data.daily?.[0]?.minTemp ?? Math.round(data.current.temperature - 3);
  
  return {
    currentTemp: hourly1300?.temp ?? data.current.temperature,
    maxTemp,
    minTemp,
    rangeString: `Max: ${maxTemp}°C / Min: ${minTemp}°C`,
    description: hourly1300?.description ?? data.current.description
  };
};

