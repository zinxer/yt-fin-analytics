import { createHash } from 'crypto';
import { encodingForModel, getEncoding, type TiktokenModel } from 'js-tiktoken';
import countryList from 'country-list';

export function iso8601DurationToSeconds(duration: string): number {
  const hours = duration.match(/(\d+)H/);
  const minutes = duration.match(/(\d+)M/);
  const seconds = duration.match(/(\d+)S/);

  return (hours ? parseInt(hours[1], 10) * 3600 : 0)
    + (minutes ? parseInt(minutes[1], 10) * 60 : 0)
    + (seconds ? parseInt(seconds[1], 10) : 0);
}

// Returns the number of tokens in a text string (falls back to o200k_base for unknown models)
export function openaiNumTokensFromString(message: string, model: string): number {
  let encoder;
  try {
    encoder = encodingForModel(model as TiktokenModel);
  } catch {
    encoder = getEncoding('o200k_base');
  }
  return encoder.encode(message).length;
}

export function isJsonString(str: string): boolean {
  try {
    JSON.parse(str);
  } catch (e) {
    return false;
  }
  return true;
}

// Short deterministic id derived from the input (md5 prefix)
export function shortHash(input: string, length = 12): string {
  return createHash('md5').update(input).digest('hex').substring(0, length);
}

// function to covert country name to country code
export function countryNameToCode(countryName: string): string {
  // country-list knows Vietnam as 'Viet Nam'
  if (countryName.toUpperCase() === 'VIETNAM') { countryName = 'Viet Nam' }

  // first check if the country name is already a country code
  if (countryList.getName(countryName) === countryName) {
    return countryName;
  }

  // If we cannot decide what country code it is, better to just return the countryName entirely
  const code = countryList.getCode(countryName);
  if (code === undefined) {
    return countryName.toUpperCase();
  }

  return code;
}
