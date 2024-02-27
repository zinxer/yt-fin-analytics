
export function iso8601DurationToSeconds(duration: any) {
    let hours = (duration.match(/(\d+)H/));
    let minutes = duration.match(/(\d+)M/);
    let seconds = duration.match(/(\d+)S/);
  
    hours = hours ? parseInt(hours[1], 10) * 3600 : 0;
    minutes = minutes ? parseInt(minutes[1], 10) * 60 : 0;
    seconds = seconds ? parseInt(seconds[1], 10) : 0;
  
    return hours + minutes + seconds;
  }