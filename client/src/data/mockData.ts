import { User, Location, WasteRequest, Role, CollectionSchedule, Notification, AssignmentRoute, AdminStats, AreaNode, CollectorStats } from '../types';

export const mockLocations: Location[] = [
  { id: 'loc1', lga: 'Akure South', ward: 'Obanla', street: 'FUTA South Gate Road' },
  { id: 'loc2', lga: 'Akure South', ward: 'Isikan', street: 'Arakale Road' },
  { id: 'loc3', lga: 'Akure North', ward: 'Oba Ile', street: 'Housing Estate' },
];

export const mockUsers: User[] = [
  {
    id: 'res1',
    name: 'John Doe',
    email: 'resident@example.com',
    phone: '+234 800 000 0001',
    address: '15 FUTA South Gate Road, Akure',
    role: 'Resident',
    locationId: 'loc1',
    createdAt: new Date().toISOString()
  },
  {
    id: 'col1',
    name: 'WasteMgt Collector A',
    email: 'collector@example.com',
    phone: '+234 800 000 0002',
    address: 'Collector Hub, Alagbaka',
    role: 'Collector',
    locationId: 'loc1', // Maybe operates in this LGA
    createdAt: new Date().toISOString()
  },
  {
    id: 'adm1',
    name: 'Super Admin',
    email: 'admin@example.com',
    phone: '+234 800 000 0003',
    role: 'Admin',
    createdAt: new Date().toISOString()
  }
];

export const mockRequests: WasteRequest[] = [
  {
    id: 'req1',
    residentId: 'res1',
    locationId: 'loc1',
    street: '15 FUTA South Gate Road',
    severity: 'Medium',
    status: 'Pending',
    type: 'General',
    requestedDate: new Date().toISOString(),
    notes: '2 bags of household waste'
  },
  {
    id: 'req2',
    residentId: 'res1',
    collectorId: 'col1',
    locationId: 'loc1',
    street: '15 FUTA South Gate Road',
    severity: 'Low',
    status: 'Completed',
    type: 'Recyclables',
    requestedDate: new Date(Date.now() - 86400000).toISOString(),
    completedDate: new Date().toISOString(),
    notes: 'Plastic bottles'
  },
  {
    id: 'req3',
    residentId: 'res2',
    locationId: 'loc2',
    street: 'Shop 105, Arakale Market',
    severity: 'High',
    status: 'In Progress',
    collectorId: 'col1',
    type: 'General',
    requestedDate: new Date(Date.now() - 3600000).toISOString(),
    notes: 'Market overflow'
  },
  {
    id: 'req4',
    residentId: 'res3',
    locationId: 'loc3',
    street: 'Housing Estate Gate',
    severity: 'Critical',
    status: 'Pending',
    type: 'Hazardous',
    requestedDate: new Date().toISOString(),
    notes: 'Medical waste bin'
  },
  {
    id: 'req5',
    residentId: 'res2',
    locationId: 'loc2',
    street: 'Old Garage Area',
    severity: 'Medium',
    status: 'Scheduled',
    collectorId: 'col2',
    type: 'Bulky',
    requestedDate: new Date(Date.now() - 172800000).toISOString(),
    notes: 'Old sofa and wooden crates'
  },
  {
    id: 'req6',
    residentId: 'res3',
    locationId: 'loc3',
    street: 'Oba Ile Crescent',
    severity: 'High',
    status: 'Completed',
    collectorId: 'col2',
    type: 'General',
    requestedDate: new Date(Date.now() - 259200000).toISOString(),
    completedDate: new Date(Date.now() - 86400000).toISOString(),
    notes: 'Weekly trash overflow'
  },
  {
    id: 'req7',
    residentId: 'res1',
    locationId: 'loc1',
    street: '15 FUTA South Gate Road',
    severity: 'Medium',
    status: 'Pending',
    type: 'Bulky',
    requestedDate: new Date().toISOString(),
    preferredDate: new Date(Date.now() + 172800000).toISOString(), // 2 days from now
    notes: 'Missed schedule, please pick up old mattress.'
  },
  {
    id: 'req8',
    residentId: 'res1',
    locationId: 'loc1',
    street: '15 FUTA South Gate Road',
    severity: 'High',
    status: 'Payment Pending',
    collectorId: 'col1',
    type: 'Hazardous',
    requestedDate: new Date(Date.now() - 86400000).toISOString(),
    preferredDate: new Date(Date.now() + 86400000).toISOString(),
    cost: 2500,
    notes: 'Broken glass and batteries. Collector accepted, awaiting payment.'
  }
];

export const mockSchedules: CollectionSchedule[] = [
  {
    id: 'sch1',
    locationId: 'loc1',
    dayOfWeek: 'Wednesday',
    nextPickup: new Date(Date.now() + 86400000 * 3).toISOString()
  },
  {
    id: 'sch2',
    locationId: 'loc1',
    dayOfWeek: 'Saturday',
    nextPickup: new Date(Date.now() + 86400000 * 6).toISOString()
  }
];

export const mockNotifications: Notification[] = [
  {
    id: 'notif1',
    userId: 'res1',
    title: 'Report Submitted',
    message: 'We have received your request for General waste pickup.',
    date: new Date().toISOString(),
    type: 'System',
    read: false
  },
  {
    id: 'notif2',
    userId: 'res1',
    title: 'Collection Reminder',
    message: 'Your weekly waste collection is scheduled for tomorrow.',
    date: new Date(Date.now() - 3600000).toISOString(),
    type: 'Reminder',
    read: true
  }
];

export const mockAssignmentRoutes: AssignmentRoute[] = [
  {
    id: 'route1',
    collectorId: 'col1',
    title: 'South Gate Main Flow',
    area: 'FUTA South Gate, Obanla & Ijoka Axis',
    collectionDate: new Date().toISOString(),
    estimatedDistance: '12.4 km',
    estimatedDuration: '3h 10m',
    status: 'Pending',
    traffic: {
      condition: 'Moderate',
      delay: '+10 mins',
      message: 'Slight congestion around South Gate and Oba Adesida junction.'
    },
    weather: {
      condition: 'Sunny',
      temperature: '28°C'
    },
    stops: [
      {
        id: 'stop1',
        address: '15 FUTA South Gate Road',
        street: 'FUTA South Gate Road',
        ward: 'Obanla',
        lga: 'Akure South',
        coordinates: { latitude: 7.3045, longitude: 5.1360 },
        wasteType: 'General',
        severity: 'Medium',
        status: 'Pending',
        reportsCount: 3,
        residentNote: 'Bags are by the blue gate.'
      },
      {
        id: 'stop2',
        address: '22 South Gate Annex',
        street: 'South Gate Annex',
        ward: 'Obanla',
        lga: 'Akure South',
        coordinates: { latitude: 7.3050, longitude: 5.1375 },
        wasteType: 'Recyclables',
        severity: 'Low',
        status: 'Pending',
        reportsCount: 1
      },
      {
        id: 'stop3',
        address: 'Phase 2 Hostels, Block A',
        street: 'Phase 2 Road',
        ward: 'Obanla',
        lga: 'Akure South',
        coordinates: { latitude: 7.3030, longitude: 5.1380 },
        wasteType: 'General',
        severity: 'High',
        status: 'Pending',
        reportsCount: 5,
        residentNote: 'Overflowing bins.'
      },
      {
        id: 'stop4',
        address: '12 Obanla Junction',
        street: 'Obanla Road',
        ward: 'Obanla',
        lga: 'Akure South',
        coordinates: { latitude: 7.2988, longitude: 5.1454 },
        wasteType: 'General',
        severity: 'Medium',
        status: 'Pending',
        reportsCount: 2
      },
      {
        id: 'stop5',
        address: '7 Cathedral Lane',
        street: 'Cathedral Road',
        ward: 'Obanla',
        lga: 'Akure South',
        coordinates: { latitude: 7.2894, longitude: 5.1518 },
        wasteType: 'General',
        severity: 'Low',
        status: 'Pending',
        reportsCount: 1
      },
      {
        id: 'stop6',
        address: '18 Stadium Area Close',
        street: 'Stadium Road',
        ward: 'Obanla',
        lga: 'Akure South',
        coordinates: { latitude: 7.2867, longitude: 5.1576 },
        wasteType: 'General',
        severity: 'Medium',
        status: 'Pending',
        reportsCount: 4
      },
      {
        id: 'stop7',
        address: '3 Odo Ijoka Street',
        street: 'Odo Ijoka Road',
        ward: 'Ijoka',
        lga: 'Akure South',
        coordinates: { latitude: 7.2835, longitude: 5.1635 },
        wasteType: 'General',
        severity: 'High',
        status: 'Pending',
        reportsCount: 6
      },
      {
        id: 'stop8',
        address: '11 Ijoka Market Front',
        street: 'Ijoka Road',
        ward: 'Ijoka',
        lga: 'Akure South',
        coordinates: { latitude: 7.2811, longitude: 5.1690 },
        wasteType: 'General',
        severity: 'High',
        status: 'Pending',
        reportsCount: 7
      },
      {
        id: 'stop9',
        address: '25 Ala Quarters Link',
        street: 'Ala Road',
        ward: 'Ijoka',
        lga: 'Akure South',
        coordinates: { latitude: 7.2788, longitude: 5.1742 },
        wasteType: 'General',
        severity: 'Medium',
        status: 'Pending',
        reportsCount: 3
      },
      {
        id: 'stop10',
        address: '14 Hospital Extension',
        street: 'Hospital Road',
        ward: 'Ijoka',
        lga: 'Akure South',
        coordinates: { latitude: 7.2769, longitude: 5.1788 },
        wasteType: 'General',
        severity: 'Medium',
        status: 'Pending',
        reportsCount: 2
      },
      {
        id: 'stop11',
        address: '6 Oja-Oba Corner',
        street: 'Oja-Oba Road',
        ward: 'Oja-Oba',
        lga: 'Akure South',
        coordinates: { latitude: 7.2738, longitude: 5.1845 },
        wasteType: 'General',
        severity: 'High',
        status: 'Pending',
        reportsCount: 8
      },
      {
        id: 'stop12',
        address: '9 Palace Rear Street',
        street: 'Palace Road',
        ward: 'Oja-Oba',
        lga: 'Akure South',
        coordinates: { latitude: 7.2719, longitude: 5.1886 },
        wasteType: 'General',
        severity: 'Medium',
        status: 'Pending',
        reportsCount: 4
      },
      {
        id: 'stop13',
        address: '33 Oba Adesida Service Lane',
        street: 'Oba Adesida Road',
        ward: 'Oja-Oba',
        lga: 'Akure South',
        coordinates: { latitude: 7.2704, longitude: 5.1935 },
        wasteType: 'Recyclables',
        severity: 'Low',
        status: 'Pending',
        reportsCount: 2
      },
      {
        id: 'stop14',
        address: '20 Isolo Community Road',
        street: 'Isolo Road',
        ward: 'Oja-Oba',
        lga: 'Akure South',
        coordinates: { latitude: 7.2690, longitude: 5.1972 },
        wasteType: 'General',
        severity: 'Medium',
        status: 'Pending',
        reportsCount: 3
      },
      {
        id: 'stop15',
        address: '4 Arakale Inner Street',
        street: 'Arakale Road',
        ward: 'Isikan',
        lga: 'Akure South',
        coordinates: { latitude: 7.2668, longitude: 5.2010 },
        wasteType: 'General',
        severity: 'High',
        status: 'Pending',
        reportsCount: 5
      },
      {
        id: 'stop16',
        address: '17 Isikan Roundabout',
        street: 'Isikan Road',
        ward: 'Isikan',
        lga: 'Akure South',
        coordinates: { latitude: 7.2642, longitude: 5.2048 },
        wasteType: 'General',
        severity: 'High',
        status: 'Pending',
        reportsCount: 6
      },
      {
        id: 'stop17',
        address: '8 NEPA Close, Isikan',
        street: 'Isikan Extension',
        ward: 'Isikan',
        lga: 'Akure South',
        coordinates: { latitude: 7.2615, longitude: 5.2082 },
        wasteType: 'General',
        severity: 'Medium',
        status: 'Pending',
        reportsCount: 2
      },
      {
        id: 'stop18',
        address: '29 Ondo Road Junction',
        street: 'Ondo Road',
        ward: 'Isikan',
        lga: 'Akure South',
        coordinates: { latitude: 7.2589, longitude: 5.2120 },
        wasteType: 'General',
        severity: 'Low',
        status: 'Pending',
        reportsCount: 1
      },
      {
        id: 'stop19',
        address: '10 Ayedun Quarters',
        street: 'Ayedun Road',
        ward: 'Ayedun',
        lga: 'Akure South',
        coordinates: { latitude: 7.2564, longitude: 5.2155 },
        wasteType: 'General',
        severity: 'Medium',
        status: 'Pending',
        reportsCount: 3
      },
      {
        id: 'stop20',
        address: '5 Alagbaka Link Road',
        street: 'Alagbaka Extension',
        ward: 'Alagbaka',
        lga: 'Akure South',
        coordinates: { latitude: 7.2542, longitude: 5.2198 },
        wasteType: 'Recyclables',
        severity: 'Low',
        status: 'Pending',
        reportsCount: 2
      }
    ]
  },

  {
    id: 'route2',
    collectorId: 'col1',
    title: 'Arakale Market Sweep',
    area: 'Arakale, Oja-Oba, Alagbaka & Ijapo Axis',
    collectionDate: new Date(Date.now() + 86400000).toISOString(),
    estimatedDistance: '15.7 km',
    estimatedDuration: '4h 05m',
    status: 'Pending',
    traffic: {
      condition: 'Heavy',
      delay: '+25 mins',
      message: 'Market-day congestion around Arakale, Oja-Oba and Alagbaka.'
    },
    weather: {
      condition: 'Cloudy',
      temperature: '24°C',
      warning: 'Chance of rain'
    },
    stops: [
      {
        id: 'stop21',
        address: 'Shop 105, Arakale Market',
        street: 'Arakale Road',
        ward: 'Isikan',
        lga: 'Akure South',
        coordinates: { latitude: 7.2510, longitude: 5.2005 },
        wasteType: 'General',
        severity: 'High',
        status: 'Pending',
        reportsCount: 10
      },
      {
        id: 'stop22',
        address: '41 Oja-Oba Main Line',
        street: 'Oja-Oba Road',
        ward: 'Oja-Oba',
        lga: 'Akure South',
        coordinates: { latitude: 7.2528, longitude: 5.1968 },
        wasteType: 'General',
        severity: 'High',
        status: 'Pending',
        reportsCount: 7
      },
      {
        id: 'stop23',
        address: '13 Oba Adesida Frontage',
        street: 'Oba Adesida Road',
        ward: 'Oja-Oba',
        lga: 'Akure South',
        coordinates: { latitude: 7.2540, longitude: 5.1920 },
        wasteType: 'General',
        severity: 'Medium',
        status: 'Pending',
        reportsCount: 4
      },
      {
        id: 'stop24',
        address: '27 Oyemekun Strip',
        street: 'Oyemekun Road',
        ward: 'Oyemekun',
        lga: 'Akure South',
        coordinates: { latitude: 7.2572, longitude: 5.1865 },
        wasteType: 'General',
        severity: 'High',
        status: 'Pending',
        reportsCount: 6
      },
      {
        id: 'stop25',
        address: '8 NEPA Junction',
        street: 'Oyemekun Road',
        ward: 'Oyemekun',
        lga: 'Akure South',
        coordinates: { latitude: 7.2598, longitude: 5.1814 },
        wasteType: 'General',
        severity: 'Medium',
        status: 'Pending',
        reportsCount: 3
      },
      {
        id: 'stop26',
        address: '16 Adegbola Street',
        street: 'Adegbola Road',
        ward: 'Oyemekun',
        lga: 'Akure South',
        coordinates: { latitude: 7.2626, longitude: 5.1769 },
        wasteType: 'Recyclables',
        severity: 'Low',
        status: 'Pending',
        reportsCount: 2
      },
      {
        id: 'stop27',
        address: '2 Government House Link',
        street: 'Alagbaka Road',
        ward: 'Alagbaka',
        lga: 'Akure South',
        coordinates: { latitude: 7.2660, longitude: 5.1725 },
        wasteType: 'General',
        severity: 'Medium',
        status: 'Pending',
        reportsCount: 5
      },
      {
        id: 'stop28',
        address: '19 Alagbaka Secretariat Gate',
        street: 'Alagbaka Avenue',
        ward: 'Alagbaka',
        lga: 'Akure South',
        coordinates: { latitude: 7.2687, longitude: 5.1689 },
        wasteType: 'General',
        severity: 'High',
        status: 'Pending',
        reportsCount: 6
      },
      {
        id: 'stop29',
        address: '12 Ministry Quarters',
        street: 'Alagbaka Quarters Road',
        ward: 'Alagbaka',
        lga: 'Akure South',
        coordinates: { latitude: 7.2714, longitude: 5.1654 },
        wasteType: 'General',
        severity: 'Medium',
        status: 'Pending',
        reportsCount: 3
      },
      {
        id: 'stop30',
        address: '5 Ijapo Estate Gate',
        street: 'Ijapo Estate Road',
        ward: 'Ijapo',
        lga: 'Akure South',
        coordinates: { latitude: 7.2741, longitude: 5.1610 },
        wasteType: 'General',
        severity: 'Medium',
        status: 'Pending',
        reportsCount: 4
      },
      {
        id: 'stop31',
        address: '31 Ijapo GRA Crescent',
        street: 'Ijapo GRA Road',
        ward: 'Ijapo',
        lga: 'Akure South',
        coordinates: { latitude: 7.2768, longitude: 5.1575 },
        wasteType: 'Recyclables',
        severity: 'Low',
        status: 'Pending',
        reportsCount: 2
      },
      {
        id: 'stop32',
        address: '10 Mercyland Extension',
        street: 'Ijapo Extension',
        ward: 'Ijapo',
        lga: 'Akure South',
        coordinates: { latitude: 7.2795, longitude: 5.1540 },
        wasteType: 'General',
        severity: 'High',
        status: 'Pending',
        reportsCount: 5
      },
      {
        id: 'stop33',
        address: '14 Shagari Village Road',
        street: 'Shagari Road',
        ward: 'Shagari',
        lga: 'Akure South',
        coordinates: { latitude: 7.2820, longitude: 5.1502 },
        wasteType: 'General',
        severity: 'Medium',
        status: 'Pending',
        reportsCount: 3
      },
      {
        id: 'stop34',
        address: '6 Idofin Quarters',
        street: 'Idofin Road',
        ward: 'Idofin',
        lga: 'Akure South',
        coordinates: { latitude: 7.2846, longitude: 5.1470 },
        wasteType: 'General',
        severity: 'Medium',
        status: 'Pending',
        reportsCount: 2
      },
      {
        id: 'stop35',
        address: '23 Hospital Roundabout',
        street: 'Hospital Road',
        ward: 'Alagbaka',
        lga: 'Akure South',
        coordinates: { latitude: 7.2875, longitude: 5.1442 },
        wasteType: 'General',
        severity: 'High',
        status: 'Pending',
        reportsCount: 6
      },
      {
        id: 'stop36',
        address: '4 Ondo State Housing',
        street: 'Housing Estate Road',
        ward: 'Alagbaka',
        lga: 'Akure South',
        coordinates: { latitude: 7.2899, longitude: 5.1416 },
        wasteType: 'General',
        severity: 'Low',
        status: 'Pending',
        reportsCount: 1
      },
      {
        id: 'stop37',
        address: '18 FUTA Junction',
        street: 'Aule Road',
        ward: 'Aule',
        lga: 'Akure South',
        coordinates: { latitude: 7.2927, longitude: 5.1390 },
        wasteType: 'General',
        severity: 'Medium',
        status: 'Pending',
        reportsCount: 3
      },
      {
        id: 'stop38',
        address: '9 Aule Central',
        street: 'Aule Main Road',
        ward: 'Aule',
        lga: 'Akure South',
        coordinates: { latitude: 7.2954, longitude: 5.1368 },
        wasteType: 'General',
        severity: 'Medium',
        status: 'Pending',
        reportsCount: 2
      },
      {
        id: 'stop39',
        address: '7 Roadblock Axis',
        street: 'Roadblock Road',
        ward: 'Aule',
        lga: 'Akure South',
        coordinates: { latitude: 7.2981, longitude: 5.1349 },
        wasteType: 'General',
        severity: 'High',
        status: 'Pending',
        reportsCount: 5
      },
      {
        id: 'stop40',
        address: '21 Obakekere Link',
        street: 'Obakekere Road',
        ward: 'Obakekere',
        lga: 'Akure South',
        coordinates: { latitude: 7.3008, longitude: 5.1331 },
        wasteType: 'Recyclables',
        severity: 'Low',
        status: 'Pending',
        reportsCount: 2
      }
    ]
  }
];

// Admin Specific Mock Data

export const mockAdminStats: AdminStats = {
  totalReports: 142,
  pendingReports: 28,
  resolvedReports: 95,
  totalCollectors: 12,
  activeRoutes: 5,
  activeSchedules: 24
};

export const mockAreaNodes: AreaNode[] = [
  {
    lga: 'Akure South',
    wards: [
      {
        name: 'Obanla',
        streets: [
          { name: 'FUTA South Gate Road', houseCount: 150 },
          { name: 'South Gate Annex', houseCount: 85 },
          { name: 'Phase 2 Road', houseCount: 220 }
        ]
      },
      {
        name: 'Isikan',
        streets: [
          { name: 'Arakale Road', houseCount: 410 },
          { name: 'Isikan Market Road', houseCount: 305 }
        ]
      }
    ]
  },
  {
    lga: 'Akure North',
    wards: [
      {
        name: 'Oba Ile',
        streets: [
          { name: 'Housing Estate', houseCount: 500 },
          { name: 'Airport Road', houseCount: 120 }
        ]
      }
    ]
  }
];

export const mockCollectorStats: CollectorStats[] = [
  {
    collectorId: 'col1',
    name: 'WasteMgt Collector A',
    activeRoutesCount: 2,
    completedRoutesCount: 45,
    assignedAreas: ['Akure South', 'Obanla', 'Isikan']
  },
  {
    collectorId: 'col2',
    name: 'Green City Squad B',
    activeRoutesCount: 1,
    completedRoutesCount: 112,
    assignedAreas: ['Akure North', 'Oba Ile']
  },
  {
    collectorId: 'col3',
    name: 'Eco Warriors West',
    activeRoutesCount: 0,
    completedRoutesCount: 8,
    assignedAreas: ['Alagbaka']
  }
];
