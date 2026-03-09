export type VehicleType = 'tram' | 'trolley' | 'bus';

export interface VehicleModel {
  id: number;
  trinmoName: string;
  name: string;
  features?: string[];
  isModel: (vehicle: { fleetNumber: string; id: string }) => boolean;
}

export interface VehicleTypeInfo {
  type: VehicleType;
  model?: VehicleModel;
  color: string;
  icon: string;
}

const sofiaModels = {
  tram: [
    {
      id: 200,
      trinmoName: "2013-Pesa-Swing-122NASF",
      name: "PESA Swing 122NaSF",
      features: ["lowFloor", "ac"],
      isModel: function (vehicle: { fleetNumber: string; id: string }) {
        const fleetNumber = Number(vehicle.fleetNumber) || Number(vehicle.fleetNumber.split("+")[0]);
        return 2301 <= fleetNumber && fleetNumber <= 2320;
      }
    },
    {
      id: 201,
      trinmoName: "2016-Pesa-Swing-122NASF2",
      name: "PESA Swing 122NaSF",
      features: ["lowFloor", "ac"],
      isModel: function (vehicle: { fleetNumber: string; id: string }) {
        const fleetNumber = Number(vehicle.fleetNumber) || Number(vehicle.fleetNumber.split("+")[0]);
        return 2321 <= fleetNumber && fleetNumber <= 2338;
      }
    },
    {
      id: 202,
      trinmoName: "2022-Pesa-Swing-122NASF2-3",
      name: "PESA Swing 122NaSF",
      features: ["lowFloor", "ac"],
      isModel: function (vehicle: { fleetNumber: string; id: string }) {
        const fleetNumber = Number(vehicle.fleetNumber) || Number(vehicle.fleetNumber.split("+")[0]);
        return 2339 <= fleetNumber && fleetNumber <= 2367;
      }
    },
    {
      id: 161,
      trinmoName: "1999-CKD-Tatra-T6A2-SF",
      name: "Tatra T6A2SF",
      isModel: function (vehicle: { fleetNumber: string; id: string }) {
        const fleetNumber = Number(vehicle.fleetNumber) || Number(vehicle.fleetNumber.split("+")[0]);
        return 2041 <= fleetNumber && fleetNumber <= 2057;
      }
    },
    {
      id: 135,
      trinmoName: "1990-CKD-Tatra-T6A2",
      name: "Tatra T6A2B",
      isModel: function (vehicle: { fleetNumber: string; id: string }) {
        const fleetNumber = Number(vehicle.fleetNumber) || Number(vehicle.fleetNumber.split("+")[0]);
        return 2033 <= fleetNumber && fleetNumber <= 2034 || 3001 <= fleetNumber && fleetNumber <= 3099;
      }
    },
    {
      id: 183,
      trinmoName: "2007-T8M-700IT",
      name: "Inekon T8M-700 IT",
      features: ["lowFloor"],
      isModel: function (vehicle: { fleetNumber: string; id: string }) {
        const fleetNumber = Number(vehicle.fleetNumber) || Number(vehicle.fleetNumber.split("+")[0]);
        return 3401 <= fleetNumber && fleetNumber <= 3499;
      }
    },
    {
      id: 136,
      trinmoName: "1990-Schindler-Waggon-AG-Be-4-6",
      name: "Schindler/Siemens Be 4/6 S",
      features: ["lowFloor"],
      isModel: function (vehicle: { fleetNumber: string; id: string }) {
        const fleetNumber = Number(vehicle.fleetNumber) || Number(vehicle.fleetNumber.split("+")[0]);
        return 601 <= fleetNumber && fleetNumber <= 699;
      }
    },
    {
      id: 165,
      trinmoName: "2000-T8K-503",
      name: "T8K-503",
      isModel: function (vehicle: { fleetNumber: string; id: string }) {
        const fleetNumber = Number(vehicle.fleetNumber) || Number(vehicle.fleetNumber.split("+")[0]);
        return 501 <= fleetNumber && fleetNumber <= 599;
      }
    },
    {
      id: 137,
      trinmoName: "1990-T8M-700",
      name: "T8M-900",
      features: ["lowFloor"],
      isModel: function (vehicle: { fleetNumber: string; id: string }) {
        const fleetNumber = Number(vehicle.fleetNumber) || Number(vehicle.fleetNumber.split("+")[0]);
        return 901 <= fleetNumber && fleetNumber <= 999;
      }
    },
    {
      id: 117,
      trinmoName: "1985-T6M-700",
      name: "T6M-700",
      isModel: function (vehicle: { fleetNumber: string; id: string }) {
        const fleetNumber = Number(vehicle.fleetNumber) || Number(vehicle.fleetNumber.split("+")[0]);
        return 701 <= fleetNumber && fleetNumber <= 899;
      }
    },
    {
      id: 130,
      trinmoName: "1988-CKD-Tatra-T6B5",
      name: "Tatra T6B5B",
      isModel: function (vehicle: { fleetNumber: string; id: string }) {
        const fleetNumber = Number(vehicle.fleetNumber) || Number(vehicle.fleetNumber.split("+")[0]);
        return 4101 <= fleetNumber && fleetNumber <= 4139;
      }
    },
    {
      id: 151,
      trinmoName: "1995-CKD-Tatra-T6A5",
      name: "Tatra T6A5",
      isModel: function (vehicle: { fleetNumber: string; id: string }) {
        const fleetNumber = Number(vehicle.fleetNumber) || Number(vehicle.fleetNumber.split("+")[0]);
        return 4140 <= fleetNumber && fleetNumber <= 4199;
      }
    },
    {
      id: 41,
      trinmoName: "1960-Duewag-GT8",
      name: "Duewag GT8",
      isModel: function (vehicle: { fleetNumber: string; id: string }) {
        const fleetNumber = Number(vehicle.fleetNumber) || Number(vehicle.fleetNumber.split("+")[0]);
        return 4401 <= fleetNumber && fleetNumber <= 4499;
      }
    },
    {
      id: 14,
      trinmoName: "1935-MAN-Siemens",
      name: "MAN/Siemens",
      isModel: function (vehicle: { fleetNumber: string; id: string }) {
        const fleetNumber = Number(vehicle.fleetNumber) || Number(vehicle.fleetNumber.split("+")[0]);
        return [92].includes(fleetNumber);
      }
    }
  ],
  trolley: [
    {
      id: 115,
      trinmoName: "1985-Ikarus-280-92T",
      name: "Ikarus 280.92T",
      isModel: function (vehicle: { fleetNumber: string; id: string }) {
        const fleetNumber = Number(vehicle.fleetNumber);
        return [2108, 2623, 2903, 2123, 2702, 2703, 2913, 2915].includes(fleetNumber);
      }
    },
    {
      id: 196,
      trinmoName: "2010-Skoda-26Tr-Solaris",
      name: "Škoda 26Tr Solaris III",
      features: ["lowFloor", "ac"],
      isModel: function (vehicle: { fleetNumber: string; id: string }) {
        const fleetNumber = Number(vehicle.fleetNumber);
        return 1601 <= fleetNumber && fleetNumber <= 1649;
      }
    },
    {
      id: 199,
      trinmoName: "2013-Skoda-27Tr-Solaris-III",
      name: "Škoda 27Tr Solaris III",
      features: ["lowFloor", "ac"],
      isModel: function (vehicle: { fleetNumber: string; id: string }) {
        const fleetNumber = Number(vehicle.fleetNumber);
        return [[1650, 1699], [2675, 2699]].some(([lowerBound, upperBound]) => lowerBound <= fleetNumber && fleetNumber <= upperBound);
      }
    },
    {
      id: 218,
      trinmoName: "2021-Skoda-27Tr-Solaris-IV",
      name: "Škoda 27Tr Solaris IV",
      features: ["lowFloor", "ac"],
      isModel: function (vehicle: { fleetNumber: string; id: string }) {
        const fleetNumber = Number(vehicle.fleetNumber);
        return 2801 <= fleetNumber && fleetNumber <= 2899;
      }
    }
  ],
  bus: [
    {
      id: 203,
      trinmoName: "2014-MAN-Lions-City-G-CNG",
      name: "MAN A23 Lion's City G NG313 CNG",
      features: ["lowFloor", "ac"],
      isModel: function (vehicle: { fleetNumber: string; id: string }) {
        const fleetNumber = Number(vehicle.fleetNumber);
        return [[1150, 1199], [2000, 2045], [3100, 3139]].some(([lowerBound, upperBound]) => lowerBound <= fleetNumber && fleetNumber <= upperBound);
      }
    },
    {
      id: 212,
      trinmoName: "2018-MAN-Lions-City-G-CNG",
      name: "MAN A23 Lion's City G NG313 CNG",
      features: ["lowFloor", "ac"],
      isModel: function (vehicle: { fleetNumber: string; id: string }) {
        const fleetNumber = Number(vehicle.fleetNumber);
        return [[1601, 1699], [2300, 2399], [3140, 3199]].some(([lowerBound, upperBound]) => lowerBound <= fleetNumber && fleetNumber <= upperBound);
      }
    },
    {
      id: 207,
      trinmoName: "2016-Yutong-ZK6126HGA",
      name: "Yutong ZK6126HGA",
      features: ["lowFloor", "ac"],
      isModel: function (vehicle: { fleetNumber: string; id: string }) {
        const fleetNumber = Number(vehicle.fleetNumber);
        return [[1201, 1299], [2046, 2099], [3600, 3649]].some(([lowerBound, upperBound]) => lowerBound <= fleetNumber && fleetNumber <= upperBound);
      }
    },
    {
      id: 214,
      trinmoName: "2018-Yutong-ZK6126HGA-CNG",
      name: "Yutong ZK6126HGA CNG",
      features: ["lowFloor", "ac"],
      isModel: function (vehicle: { fleetNumber: string; id: string }) {
        const fleetNumber = Number(vehicle.fleetNumber);
        return [[3650, 3699]].some(([lowerBound, upperBound]) => lowerBound <= fleetNumber && fleetNumber <= upperBound);
      }
    },
    {
      id: 211,
      trinmoName: "2018-BMC-Procity-CNG",
      name: "BMC Procity 12 CNG",
      features: ["lowFloor", "ac"],
      isModel: function (vehicle: { fleetNumber: string; id: string }) {
        const fleetNumber = Number(vehicle.fleetNumber);
        return [[1401, 1499], [3400, 3499]].some(([lowerBound, upperBound]) => lowerBound <= fleetNumber && fleetNumber <= upperBound)
          || [[2500, 2599]].some(([lowerBound, upperBound]) => lowerBound <= fleetNumber && fleetNumber <= upperBound) && vehicle.id.slice(0, 1) === "3";
      }
    },
    {
      id: 208,
      trinmoName: "2017-BMC-Procity-CNG",
      name: "BMC Procity 12 CNG",
      features: ["lowFloor", "ac"],
      isModel: function (vehicle: { fleetNumber: string; id: string }) {
        const fleetNumber = Number(vehicle.fleetNumber);
        return [[7041, 7171]].some(([lowerBound, upperBound]) => lowerBound <= fleetNumber && fleetNumber <= upperBound);
      }
    },
    {
      id: 172,
      trinmoName: "2003-Mercedes-O345-Conecto-G",
      name: "Mercedes-Benz O345 Conecto G",
      isModel: function (vehicle: { fleetNumber: string; id: string }) {
        const fleetNumber = Number(vehicle.fleetNumber);
        return [[1100, 1110], [1112, 1138], [2161, 2172], [3301, 3399]].some(([lowerBound, upperBound]) => lowerBound <= fleetNumber && fleetNumber <= upperBound);
      }
    },
    {
      id: 187,
      trinmoName: "2008-Mercedes-Conecto-Lf",
      name: "Mercedes-Benz Conecto LF",
      features: ["lowFloor"],
      isModel: function (vehicle: { fleetNumber: string; id: string }) {
        const fleetNumber = Number(vehicle.fleetNumber);
        return [[1801, 1899]].some(([lowerBound, upperBound]) => lowerBound <= fleetNumber && fleetNumber <= upperBound);
      }
    },
    {
      id: 221,
      trinmoName: "2022-Karsan-e-Jest",
      name: "Karsan e-JEST",
      features: ["lowFloor", "ac"],
      isModel: function (vehicle: { fleetNumber: string; id: string }) {
        const fleetNumber = Number(vehicle.fleetNumber);
        return [[1010, 1099]].some(([lowerBound, upperBound]) => lowerBound <= fleetNumber && fleetNumber <= upperBound)
          || [[2501, 2505]].some(([lowerBound, upperBound]) => lowerBound <= fleetNumber && fleetNumber <= upperBound) && vehicle.id.slice(0, 2) === "11";
      }
    },
    {
      id: 176,
      trinmoName: "2005-BMC-Belde-220-SLF",
      name: "BMC Belde 220 SLF",
      isModel: function (vehicle: { fleetNumber: string; id: string }) {
        const fleetNumber = Number(vehicle.fleetNumber);
        return [[2720, 2799], [3700, 3899]].some(([lowerBound, upperBound]) => lowerBound <= fleetNumber && fleetNumber <= upperBound);
      }
    },
    {
      id: 219,
      trinmoName: "2022-Higer-KLQ6832GEV",
      name: "Higer KLQ6832GEV",
      features: ["lowFloor", "ac"],
      isModel: function (vehicle: { fleetNumber: string; id: string }) {
        const fleetNumber = Number(vehicle.fleetNumber);
        return [[2811, 2899]].some(([lowerBound, upperBound]) => lowerBound <= fleetNumber && fleetNumber <= upperBound);
      }
    },
    {
      id: 215,
      trinmoName: "2019-Higer-KLQ6125GEV3",
      name: "Higer KLQ6125GEV3",
      features: ["lowFloor", "ac"],
      isModel: function (vehicle: { fleetNumber: string; id: string }) {
        const fleetNumber = Number(vehicle.fleetNumber);
        return [[1701, 1705], [5001, 5015], [5031, 5099]].some(([lowerBound, upperBound]) => lowerBound <= fleetNumber && fleetNumber <= upperBound);
      }
    },
    {
      id: 213,
      trinmoName: "2018-Yutong-E12LF",
      name: "Yutong E12LF",
      features: ["lowFloor", "ac"],
      isModel: function (vehicle: { fleetNumber: string; id: string }) {
        const fleetNumber = Number(vehicle.fleetNumber);
        return [[2800, 2810], [3011, 3099]].some(([lowerBound, upperBound]) => lowerBound <= fleetNumber && fleetNumber <= upperBound);
      }
    },
    {
      id: 168,
      trinmoName: "2002-Mercedes-O345-Conecto",
      name: "Mercedes-Benz O345 Conecto",
      isModel: function (vehicle: { fleetNumber: string; id: string }) {
        const fleetNumber = Number(vehicle.fleetNumber);
        return [[1901, 1999]].some(([lowerBound, upperBound]) => lowerBound <= fleetNumber && fleetNumber <= upperBound);
      }
    },
    {
      id: 159,
      trinmoName: "1999-MAN-SG262",
      name: "MAN A61 SG262",
      isModel: function (vehicle: { fleetNumber: string; id: string }) {
        const fleetNumber = Number(vehicle.fleetNumber);
        return [[2135, 2160]].some(([lowerBound, upperBound]) => lowerBound <= fleetNumber && fleetNumber <= upperBound);
      }
    },
    {
      id: 204,
      trinmoName: "2011-Mercedes-O560-Intouro-ME",
      name: "Mercedes-Benz Intouro II",
      features: ["ac"],
      isModel: function (vehicle: { fleetNumber: string; id: string }) {
        const fleetNumber = Number(vehicle.fleetNumber);
        return [[1301, 1310]].some(([lowerBound, upperBound]) => lowerBound <= fleetNumber && fleetNumber <= upperBound);
      }
    },
    {
      id: 198,
      trinmoName: "2011-Mercedes-O560-Intouro-M",
      name: "Mercedes-Benz Intouro II",
      features: ["ac"],
      isModel: function (vehicle: { fleetNumber: string; id: string }) {
        const fleetNumber = Number(vehicle.fleetNumber);
        return [[1316, 1321]].some(([lowerBound, upperBound]) => lowerBound <= fleetNumber && fleetNumber <= upperBound);
      }
    },
    {
      id: 240,
      trinmoName: "2015-Mercedes-O560-Intouro-E",
      name: "Mercedes-Benz Intouro II",
      features: ["ac"],
      isModel: function (vehicle: { fleetNumber: string; id: string }) {
        const fleetNumber = Number(vehicle.fleetNumber);
        return [[1311, 1315]].some(([lowerBound, upperBound]) => lowerBound <= fleetNumber && fleetNumber <= upperBound);
      }
    },
    {
      id: 193,
      trinmoName: "2009-MAN-Lions-City-DD",
      name: "MAN A39 Lion's City DD ND313",
      features: ["lowFloor", "ac"],
      isModel: function (vehicle: { fleetNumber: string; id: string }) {
        const fleetNumber = Number(vehicle.fleetNumber);
        return [[2602, 2605]].some(([lowerBound, upperBound]) => lowerBound <= fleetNumber && fleetNumber <= upperBound);
      }
    },
    {
      id: 156,
      trinmoName: "1998-Mercedes-O345G",
      name: "Mercedes-Benz O345G",
      isModel: function (vehicle: { fleetNumber: string; id: string }) {
        const fleetNumber = Number(vehicle.fleetNumber);
        return [3592].includes(fleetNumber);
      }
    },
    {
      id: 164,
      trinmoName: "2000-Mercedes-O345",
      name: "Mercedes-Benz O345",
      isModel: function (vehicle: { fleetNumber: string; id: string }) {
        const fleetNumber = Number(vehicle.fleetNumber);
        return [1767].includes(fleetNumber);
      }
    },
    {
      id: 173,
      trinmoName: "2003-Neoplan-N4426",
      name: "Neoplan N4426/3 Centroliner",
      features: ["lowFloor", "ac"],
      isModel: function (vehicle: { fleetNumber: string; id: string }) {
        const fleetNumber = Number(vehicle.fleetNumber);
        return [2601].includes(fleetNumber);
      }
    },
    {
      id: 912,
      trinmoName: "2017-MAN-Lions-City-CNG",
      name: "MAN A21 Lion's City NL313 CNG",
      features: ["lowFloor", "ac"],
      isModel: function (vehicle: { fleetNumber: string; id: string }) {
        const fleetNumber = Number(vehicle.fleetNumber);
        return [7173, 7175].includes(fleetNumber);
      }
    },
    {
      id: 300,
      trinmoName: "2016-MAN-Lions-City-LE",
      name: "MAN A78 Lion's City LE EL293",
      features: ["lowFloor", "ac"],
      isModel: function (vehicle: { fleetNumber: string; id: string }) {
        const fleetNumber = Number(vehicle.fleetNumber);
        return [7177].includes(fleetNumber);
      }
    },
    {
      id: 299,
      trinmoName: "2020-Mercedes-Conecto-NG",
      name: "Mercedes-Benz Conecto NG",
      features: ["lowFloor", "ac"],
      isModel: function (vehicle: { fleetNumber: string; id: string }) {
        const fleetNumber = Number(vehicle.fleetNumber);
        return [7179, 7181, 7183].includes(fleetNumber);
      }
    }
  ]
};

/**
 * Determine vehicle type and model based on fleet number and vehicle ID
 */
export function getVehicleTypeInfo(vehicleId: string, routeId: string): VehicleTypeInfo {
  // Extract fleet number from vehicle ID (e.g., "A2022" -> "2022")
  const fleetNumber = vehicleId.replace(/[A-Z]/g, '');
  
  const vehicleData = {
    fleetNumber,
    id: vehicleId
  };

  // Check route type first (more reliable)
  // Sofia routes: TM = Tram, TB = Trolleybus, A = Bus
  const routePrefix = routeId.substring(0, 2);
  
  if (routePrefix === 'TM') {
    // Tram
    const model = sofiaModels.tram.find(m => m.isModel(vehicleData));
    return {
      type: 'tram',
      model,
      color: '#DC2626', // Red
      icon: '🚋'
    };
  } else if (routePrefix === 'TB') {
    // Trolleybus
    const model = sofiaModels.trolley.find(m => m.isModel(vehicleData));
    return {
      type: 'trolley',
      model,
      color: '#2563EB', // Blue
      icon: '🚎'
    };
  } else {
    // Bus (default)
    const model = sofiaModels.bus.find(m => m.isModel(vehicleData));
    return {
      type: 'bus',
      model,
      color: '#16A34A', // Green
      icon: '🚌'
    };
  }
}

/**
 * Get color for vehicle type
 */
export function getVehicleColor(type: VehicleType): string {
  const colors: Record<VehicleType, string> = {
    tram: '#DC2626',      // Red
    trolley: '#2563EB',   // Blue
    bus: '#16A34A'        // Green
  };
  return colors[type];
}

/**
 * Get icon for vehicle type
 */
export function getVehicleIcon(type: VehicleType): string {
  const icons: Record<VehicleType, string> = {
    tram: '🚋',
    trolley: '🚎',
    bus: '🚌'
  };
  return icons[type];
}

/**
 * Get Bulgarian name for vehicle type
 */
export function getVehicleTypeName(type: VehicleType): string {
  const names: Record<VehicleType, string> = {
    tram: 'Трамвай',
    trolley: 'Тролейбус',
    bus: 'Автобус'
  };
  return names[type];
}
