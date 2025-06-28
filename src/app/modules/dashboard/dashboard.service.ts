import { MonthlyIncome, MonthlyUsers } from './dashboard.interface'; 
import Payments from '../payments/payments.models';
import moment from 'moment';
import { PAYMENT_STATUS } from '../bookings/bookings.constants';
import { initializeMonthlyData } from './dashboard.utils';
import { Types } from 'mongoose';
import Bookings from '../bookings/bookings.models';
import { BOOKING_MODEL_TYPE } from '../bookings/bookings.interface'; 
import pickQuery from '../../utils/pickQuery';
import { paginationHelper } from '../../helpers/pagination.helpers';
import { User } from '../user/user.models';
import { USER_ROLE } from '../user/user.constants';

const getHotelOwnerDashboard = async (
  query: Record<string, any>,
  authorId: string,
) => {
  const incomeYear = query.year || moment().year();
  //========================== Income aggregate ==========================\\
  const earningData = await Payments.aggregate([
    {
      $match: {
        status: PAYMENT_STATUS.paid,
        isDeleted: false,
        author: new Types.ObjectId(authorId),
      },
    },
    {
      $facet: {
        totalEarnings: [
          {
            $group: { _id: null, total: { $sum: '$hotelOwnerAmount' } },
          },
        ],
        toDayEarnings: [
          {
            $match: {
              createdAt: {
                $gte: moment().startOf('day').toDate(),
                $lte: moment().endOf('day').toDate(),
              },
            },
          },
          {
            $group: { _id: null, total: { $sum: '$hotelOwnerAmount' } },
          },
        ],
        monthlyIncome: [
          {
            $match: {
              createdAt: {
                $gte: moment().year(incomeYear).startOf('year').toDate(),
                $lte: moment().year(incomeYear).endOf('year').toDate(),
              },
            },
          },
          {
            $group: {
              _id: { month: { $month: '$createdAt' } },
              income: { $sum: '$hotelOwnerAmount' },
            },
          },
          { $sort: { '_id.month': 1 } },
        ],
      },
    },
  ]).then(data => data[0]);

  //========================== Monthly income data ==========================\\
  const monthlyIncome = initializeMonthlyData('income') as MonthlyIncome[];
  earningData.monthlyIncome.forEach(
    ({ _id, income }: { _id: { month: number }; income: number }) => {
      monthlyIncome[_id.month - 1].income = Math.round(income);
    },
  );

  //========================== Booking aggregate ==========================\\

  const bookingData = await Bookings.aggregate([
    {
      $match: {
        paymentStatus: PAYMENT_STATUS.paid,
        author: new Types.ObjectId(authorId),
        isDeleted: false,
      },
    },
    {
      $facet: {
        totalBookings: [
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
            },
          },
        ],
        todayBookings: [
          {
            $match: {
              createdAt: {
                $gte: moment().startOf('day').toDate(),
                $lte: moment().endOf('day').toDate(),
              },
            },
          },
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
            },
          },
        ],
        bookingData: [
          {
            $sort: { createdAt: -1 },
          },

          {
            $limit: 15,
          },

          // Lookups
          {
            $lookup: {
              from: 'users',
              localField: 'author',
              foreignField: '_id',
              as: 'author',
              pipeline: [
                {
                  $project: {
                    name: 1,
                    email: 1,
                    phoneNumber: 1,
                    profile: 1,
                  },
                },
              ],
            },
          },
          {
            $lookup: {
              from: 'users',
              localField: 'user',
              foreignField: '_id',
              as: 'user',
              pipeline: [
                {
                  $project: {
                    name: 1,
                    email: 1,
                    phoneNumber: 1,
                    profile: 1,
                  },
                },
              ],
            },
          },

          {
            $lookup: {
              from: 'apartments',
              localField: 'reference',
              foreignField: '_id',
              as: 'apartmentDetails',
            },
          },
          {
            $lookup: {
              from: 'roomtypes',
              localField: 'reference',
              foreignField: '_id',
              as: 'roomDetails',
            },
          },
          {
            $addFields: {
              reference: {
                $cond: {
                  if: { $eq: ['$modelType', BOOKING_MODEL_TYPE.Apartment] },
                  then: '$apartmentDetails',
                  else: '$roomDetails',
                },
              },
            },
          },
          {
            $project: {
              apartmentDetails: 0,
              roomDetails: 0,
            },
          },

          {
            $addFields: {
              author: { $arrayElemAt: ['$author', 0] },
              user: { $arrayElemAt: ['$user', 0] },
              reference: { $arrayElemAt: ['$reference', 0] },
            },
          },
        ],
      },
    },
  ]).then(data => data[0]);
  return {
    toDayIncome: earningData?.toDayEarnings[0]?.total || 0,
    totalIncome: earningData?.totalEarnings[0]?.total || 0,
    monthlyIncome,
    toDayBookings: bookingData?.todayBookings[0]?.total || 0,
    totalBookings: bookingData?.totalBookings[0]?.total || 0,
    bookingsData: bookingData?.bookingData || [],
  };
};

const getHotelOwnerEarning = async (
  query: Record<string, any>,
  authorId: string,
) => {
  const { filters, pagination } = await pickQuery(query);
  const { searchTerm, ...filtersData } = filters;
  const pipeline = [];

  pipeline.push({
    $match: {
      status: PAYMENT_STATUS.paid,
      isDeleted: false,
      author: new Types.ObjectId(authorId),
    },
  });

  if (searchTerm) {
    pipeline.push({
      $match: {
        $or: ['tranId', 'othersFacilities'].map(field => ({
          [field]: {
            $regex: searchTerm,
            $options: 'i',
          },
        })),
      },
    });
  }

  if (Object.entries(filtersData).length) {
    Object.entries(filtersData).forEach(([field, value]) => {
      if (/^\[.*?\]$/.test(value)) {
        const match = value.match(/\[(.*?)\]/);
        const queryValue = match ? match[1] : value;
        pipeline.push({
          $match: {
            [field]: { $in: [new Types.ObjectId(queryValue)] },
          },
        });
        delete filtersData[field];
      } else {
        // 🔁 Convert to number if numeric string
        if (!isNaN(value)) {
          filtersData[field] = Number(value);
        }
      }
    });

    if (Object.entries(filtersData).length) {
      pipeline.push({
        $match: {
          $and: Object.entries(filtersData).map(([field, value]) => ({
            isDeleted: false,
            [field]: value,
          })),
        },
      });
    }
  }

  // Sorting condition
  const { page, limit, skip, sort } =
    paginationHelper.calculatePagination(pagination);

  if (sort) {
    const sortArray = sort.split(',').map(field => {
      const trimmedField = field.trim();
      if (trimmedField.startsWith('-')) {
        return { [trimmedField.slice(1)]: -1 };
      }
      return { [trimmedField]: 1 };
    });

    pipeline.push({ $sort: Object.assign({}, ...sortArray) });
  }
  pipeline.push({
    $facet: {
      totalData: [{ $count: 'total' }],
      paginatedData: [
        { $skip: skip },
        { $limit: limit },
        // Lookups
        {
          $lookup: {
            from: 'users',
            localField: 'user',
            foreignField: '_id',
            as: 'user',
            pipeline: [
              {
                $project: {
                  name: 1,
                  email: 1,
                  phoneNumber: 1,
                  profile: 1,
                },
              },
            ],
          },
        },

        {
          $lookup: {
            from: 'bookings',
            localField: 'bookings',
            foreignField: '_id',
            as: 'bookings',
          },
        },

        {
          $addFields: {
            user: { $arrayElemAt: ['$user', 0] },
            bookings: { $arrayElemAt: ['$bookings', 0] },
          },
        },
      ],
    },
  });

  const [earningData] = await Payments.aggregate(pipeline);

  const earningOverView = await Payments.aggregate([
    {
      $match: {
        status: PAYMENT_STATUS.paid,
        isDeleted: false,
        author: new Types.ObjectId(authorId),
      },
    },
    {
      $facet: {
        totalEarnings: [
          {
            $group: { _id: null, total: { $sum: '$hotelOwnerAmount' } },
          },
        ],
        toDayEarnings: [
          {
            $match: {
              createdAt: {
                $gte: moment().startOf('day').toDate(),
                $lte: moment().endOf('day').toDate(),
              },
            },
          },
          {
            $group: { _id: null, total: { $sum: '$hotelOwnerAmount' } },
          },
        ],
      },
    },
  ]).then(data => data[0]);

  const total = earningData?.totalData?.[0]?.total || 0;
  const data = earningData?.paginatedData || [];

  return {
    meta: { page, limit, total },
    toDayEarnings: earningOverView?.toDayEarnings[0]?.total || 0,
    totalEarnings: earningOverView?.totalEarnings[0]?.total || 0,
    EarningsData: data,
  };
};

const getAdminDashboard = async (query: Record<string, any>) => {
  const joinYear = query.year || moment().year();
  const roleFilter = query.role
    ? { role: query.role }
    : { role: { $in: [USER_ROLE.user, USER_ROLE.hotel_owner] } };
  //========================== Income aggregate ==========================\\
  const earningData = await Payments.aggregate([
    {
      $match: {
        status: PAYMENT_STATUS.paid,
        isDeleted: false,
      },
    },
    {
      $facet: {
        totalEarnings: [
          {
            $group: { _id: null, total: { $sum: '$hotelOwnerAmount' } },
          },
        ],
        toDayEarnings: [
          {
            $match: {
              createdAt: {
                $gte: moment().startOf('day').toDate(),
                $lte: moment().endOf('day').toDate(),
              },
            },
          },
          {
            $group: { _id: null, total: { $sum: '$hotelOwnerAmount' } },
          },
        ],
      },
    },
  ]).then(data => data[0]);

  //========================== Users aggregate ==========================\\
  const usersData = await User.aggregate([
    {
      $match: { isDeleted: false, 'verification.status': true },
    },
    {
      $facet: {
        allRegisteredUsers: [{ $count: 'count' }],
        totalHotelOwner: [
          {
            $match: {
              role: USER_ROLE.hotel_owner,
            },
          },
          { $count: 'count' },
        ],
        totalUser: [{ $match: { role: USER_ROLE.user } }, { $count: 'count' }],

        monthlyUsers: [
          {
            $match: {
              ...roleFilter,
              createdAt: {
                $gte: moment().year(joinYear).startOf('year').toDate(),
                $lte: moment().year(joinYear).endOf('year').toDate(),
              },
            },
          },
          {
            $group: {
              _id: { month: { $month: '$createdAt' } },
              total: { $sum: 1 },
            },
          },
          { $sort: { '_id.month': 1 } },
        ],

        lastRegisterUsersData: [
          {
            $sort: { createdAt: -1 },
          },
          {
            $limit: 15,
          },
        ],
      },
    },
  ]).then(data => data[0]);

  // Format monthly users
  const monthlyUsers = initializeMonthlyData('total') as MonthlyUsers[];
  usersData.monthlyUsers.forEach(
    ({ _id, total }: { _id: { month: number }; total: number }) => {
      monthlyUsers[_id.month - 1].total = Math.round(total);
    },
  );

  //========================== Booking aggregate ==========================\\
  const monthString = query?.bookingMonth || moment().format('YYYY-MM');

  const startOfMonth = moment(monthString, 'YYYY-MM').startOf('month').utc();
  const endOfMonth = moment(monthString, 'YYYY-MM').endOf('month').utc();

  // 2. Generate full list of dates in the month
  const totalDays = endOfMonth.date(); // number of days in month
  const allDates = Array.from({ length: totalDays }).map((_, i) => {
    const date = moment(startOfMonth).add(i, 'days');
    return {
      date: date.toDate(),
      formatted: date.format('YYYY-MM-DD'),
      dayOfWeek: date.day(), // 0 = Sunday
      weekOfMonth: Math.ceil(date.date() / 7),
    };
  });

  // 3. Get booking data from MongoDB
  const bookingData = await Bookings.aggregate([
    {
      $match: {
        startDate: { $gte: startOfMonth.toDate(), $lte: endOfMonth.toDate() },
        isDeleted: false,
      },
    },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: '%Y-%m-%d', date: '$startDate' } },
        },
        count: { $sum: 1 },
      },
    },
  ]);

  // 4. Transform DB result to a map for quick lookup
  const bookingMap = new Map(
    bookingData.map(item => [item._id.date, item.count]),
  );

  // 5. Merge full calendar with actual booking counts
  const mergedData = allDates.map(d => ({
    date: d.date,
    count: bookingMap.get(d.formatted) || 0,
    dayOfWeek: d.dayOfWeek, // 0 = Sunday
    weekOfMonth: d.weekOfMonth,
  }));

  // const bookingData = await Bookings.aggregate([
  //   {
  //     $match: {
  //       startDate: { $gte: startOfMonth, $lte: endOfMonth },
  //       isDeleted: false,
  //     },
  //   },
  //   {
  //     $group: {
  //       _id: {
  //         date: { $dateToString: { format: '%Y-%m-%d', date: '$startDate' } },
  //       },
  //       count: { $sum: 1 },
  //     },
  //   },
  //   {
  //     $addFields: {
  //       date: { $toDate: '$_id.date' },
  //       dayOfWeek: { $dayOfWeek: { $toDate: '$_id.date' } }, // 1 = Sunday, 7 = Saturday
  //       weekOfMonth: {
  //         $ceil: {
  //           $divide: [{ $dayOfMonth: { $toDate: '$_id.date' } }, 7],
  //         },
  //       },
  //     },
  //   },
  //   {
  //     $project: {
  //       _id: 0,
  //       date: 1,
  //       count: 1,
  //       dayOfWeek: { $subtract: ['$dayOfWeek', 1] }, // Make it 0-indexed (0 = Sunday)
  //       weekOfMonth: 1,
  //     },
  //   },
  //   {
  //     $sort: { date: 1 },
  //   },
  // ]);
 
  return {
    toDayIncome: earningData?.toDayEarnings[0]?.total || 0,
    totalIncome: earningData?.totalEarnings[0]?.total || 0,
    allRegisteredUsers: usersData?.allRegisteredUsers[0]?.count || 0,
    totalHotelOwner: usersData?.totalHotelOwner[0]?.count || 0,
    totalUser: usersData?.totalUser[0]?.count || 0,
    monthlyUsers,
    lastRegisterUsersData: usersData?.lastRegisterUsersData || [],
    bookingsData: mergedData || [],
  };
};

const getAdminEarning = async (query: Record<string, any>) => {
  const { filters, pagination } = await pickQuery(query);
  const { searchTerm, ...filtersData } = filters;
  const pipeline = [];

  pipeline.push({
    $match: {
      status: PAYMENT_STATUS.paid,
      isDeleted: false,
    },
  });

  if (searchTerm) {
    pipeline.push({
      $match: {
        $or: ['tranId', 'othersFacilities'].map(field => ({
          [field]: {
            $regex: searchTerm,
            $options: 'i',
          },
        })),
      },
    });
  }

  if (Object.entries(filtersData).length) {
    Object.entries(filtersData).forEach(([field, value]) => {
      if (/^\[.*?\]$/.test(value)) {
        const match = value.match(/\[(.*?)\]/);
        const queryValue = match ? match[1] : value;
        pipeline.push({
          $match: {
            [field]: { $in: [new Types.ObjectId(queryValue)] },
          },
        });
        delete filtersData[field];
      } else {
        // 🔁 Convert to number if numeric string
        if (!isNaN(value)) {
          filtersData[field] = Number(value);
        }
      }
    });

    if (Object.entries(filtersData).length) {
      pipeline.push({
        $match: {
          $and: Object.entries(filtersData).map(([field, value]) => ({
            isDeleted: false,
            [field]: value,
          })),
        },
      });
    }
  }

  // Sorting condition
  const { page, limit, skip, sort } =
    paginationHelper.calculatePagination(pagination);

  if (sort) {
    const sortArray = sort.split(',').map(field => {
      const trimmedField = field.trim();
      if (trimmedField.startsWith('-')) {
        return { [trimmedField.slice(1)]: -1 };
      }
      return { [trimmedField]: 1 };
    });

    pipeline.push({ $sort: Object.assign({}, ...sortArray) });
  }
  pipeline.push({
    $facet: {
      totalData: [{ $count: 'total' }],
      paginatedData: [
        { $skip: skip },
        { $limit: limit },
        // Lookups
        {
          $lookup: {
            from: 'users',
            localField: 'user',
            foreignField: '_id',
            as: 'user',
            pipeline: [
              {
                $project: {
                  name: 1,
                  email: 1,
                  phoneNumber: 1,
                  profile: 1,
                },
              },
            ],
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: 'author',
            foreignField: '_id',
            as: 'author',
            pipeline: [
              {
                $project: {
                  name: 1,
                  email: 1,
                  phoneNumber: 1,
                  profile: 1,
                },
              },
            ],
          },
        },

        {
          $lookup: {
            from: 'bookings',
            localField: 'bookings',
            foreignField: '_id',
            as: 'bookings',
          },
        },

        {
          $addFields: {
            user: { $arrayElemAt: ['$user', 0] },
            author: { $arrayElemAt: ['$author', 0] },
            bookings: { $arrayElemAt: ['$bookings', 0] },
          },
        },
      ],
    },
  });

  const [earningData] = await Payments.aggregate(pipeline);

  const earningOverView = await Payments.aggregate([
    {
      $match: {
        status: PAYMENT_STATUS.paid,
        isDeleted: false,
      },
    },
    {
      $facet: {
        totalEarnings: [
          {
            $group: { _id: null, total: { $sum: '$adminAmount' } },
          },
        ],
        totalAppTransitionAmount: [
          {
            $group: { _id: null, total: { $sum: '$amount' } },
          },
        ],
        toDayEarnings: [
          {
            $match: {
              createdAt: {
                $gte: moment().startOf('day').toDate(),
                $lte: moment().endOf('day').toDate(),
              },
            },
          },
          {
            $group: { _id: null, total: { $sum: '$adminAmount' } },
          },
        ],
      },
    },
  ]).then(data => data[0]);

  const total = earningData?.totalData?.[0]?.total || 0;
  const data = earningData?.paginatedData || [];

  return {
    meta: { page, limit, total },
    toDayEarnings: earningOverView?.toDayEarnings[0]?.total || 0,
    totalEarnings: earningOverView?.totalEarnings[0]?.total || 0,
    totalAppTransitionAmount:
      earningOverView?.totalAppTransitionAmount[0]?.total || 0,
    EarningsData: data,
  };
};
export const dashboardService = {
  getHotelOwnerDashboard,
  getHotelOwnerEarning,
  getAdminDashboard,
  getAdminEarning,
};
