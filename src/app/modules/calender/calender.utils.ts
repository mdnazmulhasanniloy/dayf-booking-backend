// calendar.utils.ts
import moment from 'moment';

export const getDateRange = (startDate: Date, endDate: Date): Date[] => {
  const dates: Date[] = [];
  const current = moment(startDate).utc().startOf('day');
  const end = moment(endDate).utc().startOf('day');

  while (current.isBefore(end)) {
    dates.push(current.clone().toDate());
    current.add(1, 'day');
  }
  return dates;  
};
