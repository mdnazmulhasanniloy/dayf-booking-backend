import { modeType } from './../notification/notification.interface';
import { MonthlyIncome, MonthlyUsers } from './dashboard.interface';
import Payments from '../payments/payments.models';
import moment from 'moment';
import { BOOKING_STATUS, PAYMENT_STATUS } from '../bookings/bookings.constants';
import { initializeMonthlyData } from './dashboard.utils';
import { Types } from 'mongoose';
import Bookings from '../bookings/bookings.models';
import { BOOKING_MODEL_TYPE } from '../bookings/bookings.interface';
import pickQuery from '../../utils/pickQuery';
import { paginationHelper } from '../../helpers/pagination.helpers';
import { User } from '../user/user.models';
import { USER_ROLE } from '../user/user.constants';
import Apartment from '../apartment/apartment.models';

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

const getDashboardTopCardDetails = async () => {
  const startOfMonth = moment().startOf('month');
  const endOfMonth = moment().endOf('month');

  const bookingData = await Bookings.aggregate([
    {
      $match: {
        isDeleted: false,
      },
    },
    {
      $facet: {
        thisMontActiveUsers: [
          {
            $match: {
              paymentStatus: PAYMENT_STATUS.paid,
              createdAt: {
                $gte: startOfMonth.toDate(),
                $lte: endOfMonth.toDate(),
              },
            },
          },
          {
            $group: {
              _id: '$userId',
            },
          },
          {
            $count: 'uniqueUsers',
          },
        ],
        thisMontTotalBookings: [
          {
            $match: {
              paymentStatus: PAYMENT_STATUS.paid,
              createdAt: {
                $gte: startOfMonth.toDate(),
                $lte: endOfMonth.toDate(),
              },
            },
          },

          {
            $count: 'Bookings',
          },
        ],
      },
    },
  ]).then(data => data[0]);

  const totalHotelOwner = await User.countDocuments({
    role: USER_ROLE.hotel_owner,
    isDeleted: false,
  });

  const payment = await Payments.aggregate([
    {
      $match: { status: PAYMENT_STATUS.paid, isDeleted: false },
    },
    {
      $facet: {
        totalEarnings: [
          {
            $group: { _id: null, total: { $sum: '$amount' } },
          },
        ],
        totalCommission: [
          {
            $group: { _id: null, total: { $sum: '$adminAmount' } },
          },
        ],
      },
    },
  ]).then(data => data[0]);
  return {
    thisMontActiveUsers: bookingData?.thisMontActiveUsers[0]?.uniqueUsers || 0,
    thisMontTotalBookings: bookingData?.thisMontTotalBookings[0]?.Bookings || 0,
    totalHotelOwner,
    totalEarning: payment?.totalEarnings[0]?.total || 0,
    totalCommission: payment?.totalCommission[0]?.total || 0,
  };
};

const getUserOverview = async (query: Record<string, any>) => {
  const userYear = query?.JoinYear ? query?.JoinYear : moment().year();
  const startOfUserYear = moment().year(userYear).startOf('year');
  const endOfUserYear = moment().year(userYear).endOf('year');

  const monthlyUserData = await User.aggregate([
    {
      $match: {
        'verification.status': true,
        role: {
          $ne: [USER_ROLE.admin, USER_ROLE.sub_admin, USER_ROLE.super_admin],
        },
        createdAt: {
          $gte: startOfUserYear.toDate(),
          $lte: endOfUserYear.toDate(),
        },
      },
    },
    {
      $project: {
        month: { $month: '$createdAt' },
        isHotelOwner: { $eq: ['$role', USER_ROLE.hotel_owner] },
      },
    },
    {
      $group: {
        _id: { month: '$month' },
        totalUsers: { $sum: 1 },
        totalHotelOwners: {
          $sum: { $cond: [{ $eq: ['$isHotelOwner', true] }, 1, 0] },
        }, // Count hotel owners
      },
    },
    {
      $sort: { '_id.month': 1 },
    },
  ]);

  // Format monthly data to have an entry for each month
  const formattedMonthlyUsers = Array.from({ length: 12 }, (_, index) => ({
    month: moment().month(index).format('MMM'),
    totalUsers: 0,
    totalHotelOwners: 0,
  }));

  monthlyUserData.forEach(entry => {
    formattedMonthlyUsers[entry._id.month - 1].totalUsers = Math.round(
      entry.totalUsers,
    );
    formattedMonthlyUsers[entry._id.month - 1].totalHotelOwners = Math.round(
      entry.totalHotelOwners,
    );
  });

  return formattedMonthlyUsers;
};

const getBookingOverview = async (query: Record<string, any>) => {
  const month =
    query?.month !== undefined ? Number(query.month) - 1 : moment().month();
  const year = query?.year || moment().year();
  const date = moment().year(year).month(month);
  const startDate = moment(date).startOf('month').toDate();
  const endDate = moment(date).endOf('month').toDate();

  console.log(startDate);
  console.log(endDate);
  const bookingData = await Bookings.aggregate([
    {
      $match: {
        paymentStatus: PAYMENT_STATUS.paid,
        startDate: { $gte: startDate },
        endDate: { $lte: endDate },
        isDeleted: false,
      },
    },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$startDate' },
        },
        totalBookings: { $sum: 1 },
      },
    },
    {
      $sort: { _id: 1 },
    },
  ]);

  const formattedData = Array.from(
    { length: endDate.getDate() },
    (_, index) => ({
      date: moment(startDate).add(index, 'days').format('YYYY-MM-DD'),
      totalBookings: 0,
    }),
  );

  bookingData.forEach((entry: any) => {
    const dateIndex = moment(entry._id).diff(startDate, 'days');
    formattedData[dateIndex].totalBookings = entry.totalBookings;
  });

  return formattedData;
};

const getRevenueOverview = async (query: Record<string, any>) => {
  const year = query?.year ? query?.year : moment().year();
  const startOfYear = moment().year(year).startOf('year');
  const endOfYear = moment().year(year).endOf('year');

  const revenueData = await Payments.aggregate([
    {
      $match: {
        status: 'paid', // Only include paid payments
        isDeleted: false, // Only include non-deleted payments
        createdAt: {
          // Ensure payments are within the selected year
          $gte: startOfYear.toDate(),
          $lte: endOfYear.toDate(),
        },
      },
    },
    {
      $project: {
        month: { $month: '$createdAt' }, // Extract the month from the payment's createdAt date
        adminAmount: 1, // Include the adminAmount field for commission calculations
        amount: 1, // Include the total payment amount
      },
    },
    {
      $group: {
        _id: { month: '$month' }, // Group by month
        commissions: { $sum: '$adminAmount' }, // Sum the adminAmount for commissions
        totalRevenue: { $sum: '$amount' }, // Sum the total payment amount
      },
    },
    {
      $sort: { '_id.month': 1 }, // Sort by month in ascending order
    },
  ]);

  // Format the output to ensure all months are present, even if some months have no data
  const formattedRevenueData = Array.from({ length: 12 }, (_, index) => ({
    month: moment().month(index).format('MMM'), // Month name (e.g., Jan, Feb, ...)
    commissions: 0, // Default commission to 0
    totalRevenue: 0, // Default revenue to 0
  }));

  // Populate the data from the aggregation result
  revenueData.forEach(entry => {
    const monthIndex = entry._id.month - 1; // Adjust for zero-based indexing
    formattedRevenueData[monthIndex].commissions = entry.commissions;
    formattedRevenueData[monthIndex].totalRevenue = entry.totalRevenue;
  });

  return formattedRevenueData;
};

const getBookingPerformance = async (query: Record<string, any>) => {
  const bookingData = await Bookings.aggregate([
    {
      $match: {
        paymentStatus: PAYMENT_STATUS.paid,
        isDeleted: false,
      },
    },
    {
      $facet: {
        avgStay: [
          {
            $project: {
              stayDuration: { $subtract: ['$endDate', '$startDate'] },
            },
          },
          {
            $group: {
              _id: null,
              avgStay: { $avg: '$stayDuration' },
            },
          },
        ],

        cancellationRate: [
          {
            $match: { status: BOOKING_STATUS.cancelled },
          },
          {
            $group: {
              _id: null,
              cancelledBookings: { $sum: 1 },
            },
          },
        ],

        conversionRate: [
          {
            $match: {
              status: {
                $in: [
                  BOOKING_STATUS.completed,
                  BOOKING_STATUS.cancelled,
                  BOOKING_STATUS.pending,
                  BOOKING_STATUS.confirmed,
                ],
              },
            },
          },
          {
            $count: 'totalConversions',
          },
        ],
      },
    },
    {
      $project: {
        avgStay: { $arrayElemAt: ['$avgStay.avgStay', 0] },
        cancellationRate: {
          $cond: {
            if: { $gt: [{ $size: '$cancellationRate' }, 0] },
            then: {
              $divide: [
                { $arrayElemAt: ['$cancellationRate.cancelledBookings', 0] },
                { $size: '$avgStay' },
              ],
            },
            else: 0,
          },
        },
        conversionRate: {
          $cond: {
            if: { $gt: [{ $size: '$conversionRate' }, 0] },
            then: {
              $divide: [
                { $arrayElemAt: ['$conversionRate.totalConversions', 0] },
                100,
              ],
            },
            else: 0,
          },
        },
      },
    },
  ]);

  const performanceData = bookingData[0];

  const avgStayInDays = performanceData.avgStay / (1000 * 60 * 60 * 24);

  return {
    avgStay: avgStayInDays.toFixed(2),
    cancellationRate: (performanceData.cancellationRate * 100).toFixed(2),
    conversionRate: (performanceData.conversionRate * 100).toFixed(2),
  };
};
const getPropertiesOverview = async (query: Record<string, any>) => {
  const startOfMonth = moment().startOf('month').toDate();
  const endOfMonth = moment().endOf('month').toDate();
  const apartmentData = await Apartment.aggregate([
    {
      $match: { isDeleted: false }, // Only consider apartments that are not deleted
    },
    {
      $facet: {
        activeApartment: [
          {
            $count: 'activeApartment', // Count the number of active apartments
          },
        ],
        newListingsApartment: [
          {
            $match: {
              createdAt: { $gte: startOfMonth, $lte: endOfMonth }, // Filter for new listings in the current month
            },
          },
          {
            $count: 'newListings', // Count the number of new listings in the current month
          },
        ],
      },
    },
  ]);

  // Extract the results and format them properly
  const activeApartmentCount =
    apartmentData[0]?.activeApartment[0]?.activeApartment || 0;
  const newListingsCount =
    apartmentData[0]?.newListingsApartment[0]?.newListings || 0;

  const topApartments = await Bookings.aggregate([
    {
      $match: { isDeleted: false, modelType: BOOKING_MODEL_TYPE.Apartment },
    },
    {
      $group: {
        _id: '$reference',
        totalBookings: { $sum: 1 },
        totalRevenue: { $sum: '$totalPrice' },
      },
    },
    {
      $sort: { totalBookings: -1 },
    },
    {
      $limit: 5,
    },
    {
      $sort: { totalRevenue: -1 },
    },
    {
      $lookup: {
        from: 'apartments',
        localField: '_id',
        foreignField: '_id',
        as: 'apartments',
      },
    },
    {
      $unwind: '$apartments',
    },
    {
      $project: {
        _id: '$_id',
        totalBookings: 1,
        id: '$apartments.id',
        images: '$apartments.images',
        name: '$apartments.name',
        profile: '$apartments.profile',
        Price: '$apartments.price',
        avgRating: '$apartments.avgRating',
        propertyLocation: '$apartments.location',
      },
    },
  ]);

  return { activeApartmentCount, newListingsCount, topApartments };
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
      $match: {
        isDeleted: false,
        'verification.status': true,
        $match: {
          ...roleFilter,
          createdAt: {
            $gte: moment().year(joinYear).startOf('year').toDate(),
            $lte: moment().year(joinYear).endOf('year').toDate(),
          },
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
  ]).then(data => data[0]);

  // Format monthly users
  const monthlyUsers = initializeMonthlyData('total') as MonthlyUsers[];
  usersData.forEach(
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
  getDashboardTopCardDetails,
  getUserOverview,
  getBookingOverview,
  getRevenueOverview,
  getBookingPerformance,
  getPropertiesOverview,
};
