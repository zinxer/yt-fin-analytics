import { encoding_for_model } from "@dqbd/tiktoken";
import countryList from 'country-list';

export function iso8601DurationToSeconds(duration: any) {
  let hours = (duration.match(/(\d+)H/));
  let minutes = duration.match(/(\d+)M/);
  let seconds = duration.match(/(\d+)S/);

  hours = hours ? parseInt(hours[1], 10) * 3600 : 0;
  minutes = minutes ? parseInt(minutes[1], 10) * 60 : 0;
  seconds = seconds ? parseInt(seconds[1], 10) : 0;

  return hours + minutes + seconds;
}

//Returns the number of tokens in a text string
export function openaiNumTokensFromString(message: string, model: string) {
  if (model === undefined) {
    return null
  }
  const encoder = encoding_for_model(model as any);

  const tokens = encoder.encode(message);
  encoder.free();
  return tokens.length;
}

export function isJsonString(str: string) {
  try {
    JSON.parse(str);
  } catch (e) {
    return false;
  }
  return true;
}

// function to covert country name to country code
export function countryNameToCode(countryName: string) {
  // custom modification for Vietnam
  if (countryName.toUpperCase() === 'VIETNAM') { countryName = 'Viet Nam' }

  // first check if the country name is already a country code
  if (countryList.getName(countryName) === countryName) {
    return countryName;
  }

  // If we cannot decide what country code it is, better to just return the countryName entirely
  if (countryList.getCode(countryName) === undefined) {
    return countryName.toUpperCase();
  }

  return countryList.getCode(countryName);
}