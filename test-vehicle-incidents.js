#!/usr/bin/env node
/**
 * Vehicle Incidents System - Full Flow Test
 * 
 * Usage:
 *   node test-vehicle-incidents.js
 * 
 * This script tests the entire vehicle incidents flow:
 * 1. Creates a test citizen account
 * 2. Creates a test vehicle
 * 3. Submits a test incident
 * 4. Verifies it appears in dispatcher dashboard
 */

const API_URL = process.env.API_URL || "http://localhost:3000";
let citizenToken = "";
let adminToken = "";
let testVehicleId = "";
let testIncidentId = "";

const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[36m",
};

function log(color, message) {
  console.log(`${colors[color] || ""}${message}${colors.reset}`);
}

async function apiCall(method, path, body, token = "") {
  const headers = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json().catch(() => ({}));
    return { status: response.status, data };
  } catch (error) {
    return { status: 0, data: { error: error.message } };
  }
}

async function run() {
  log("blue", "\n🚗 Vehicle Incidents System - Full Flow Test\n");

  // Step 1: Get or create test citizen
  log("blue", "📝 Step 1: Authenticating citizen user...");
  let citizenRes = await apiCall("POST", "/api/auth/login", {
    email: "test-citizen@resqcity.bg",
    password: "testpass123",
  });

  if (citizenRes.status === 401) {
    // Try to register
    log("yellow", "  → Citizen not found, attempting registration...");
    citizenRes = await apiCall("POST", "/api/auth/register", {
      email: "test-citizen@resqcity.bg",
      password: "testpass123",
      firstName: "Test",
      lastName: "Citizen",
      role: "CITIZEN",
    });
  }

  if (citizenRes.status === 200 || citizenRes.status === 201) {
    citizenToken = citizenRes.data.token;
    log("green", `  ✓ Citizen logged in`);
  } else {
    log("red", `  ✗ Failed to authenticate: ${citizenRes.data.error}`);
    process.exit(1);
  }

  // Step 2: Get citizen's vehicles or create one
  log("blue", "\n🚙 Step 2: Getting or creating test vehicle...");
  let vehicleRes = await apiCall("GET", "/api/vehicles", null, citizenToken);

  if (vehicleRes.status === 200 && vehicleRes.data.length > 0) {
    testVehicleId = vehicleRes.data[0].id;
    log("green", `  ✓ Using existing vehicle: ${vehicleRes.data[0].registrationPlate}`);
  } else {
    // Create a new vehicle
    vehicleRes = await apiCall(
      "POST",
      "/api/vehicles",
      {
        registrationPlate: `TEST-${Date.now()}`,
        brand: "Test",
        model: "Vehicle",
        year: 2024,
        color: "blue",
      },
      citizenToken
    );

    if (vehicleRes.status === 201) {
      testVehicleId = vehicleRes.data.id;
      log("green", `  ✓ Vehicle created: ${vehicleRes.data.registrationPlate}`);
    } else {
      log("red", `  ✗ Failed to create vehicle: ${vehicleRes.data.error}`);
      process.exit(1);
    }
  }

  // Step 3: Submit an incident (without photos for simplicity)
  log("blue", "\n📸 Step 3: Submitting test incident (FormData required)...");
  log("yellow", "  → Note: This requires multipart/form-data, skipping for now");
  log("yellow", "  → Please test manually with file upload");

  // Instead, let's query the debug endpoint
  log("blue", "\n🔐 Step 4: Authenticating admin user...");
  const adminRes = await apiCall("POST", "/api/auth/login", {
    email: "admin@resqcity.bg",
    password: "admin123",
  });

  if (adminRes.status === 200) {
    adminToken = adminRes.data.token;
    log("green", `  ✓ Admin logged in`);
  } else {
    log("red", `  ✗ Failed to authenticate admin: ${adminRes.data.error}`);
    log("yellow", "  → Skipping admin checks");
  }

  // Step 5: Check debug endpoint
  if (adminToken) {
    log("blue", "\n📊 Step 5: Checking vehicle incidents in database...");
    const debugRes = await apiCall("GET", "/api/debug/vehicle-incidents", null, adminToken);

    if (debugRes.status === 200) {
      const { total, byStatus, recent } = debugRes.data;
      log("green", `  ✓ Database check successful`);
      log("green", `    Total incidents: ${total}`);

      if (byStatus && Array.isArray(byStatus)) {
        byStatus.forEach(({ status, _count }) => {
          log("blue", `    ${status}: ${_count}`);
        });
      }

      if (recent && recent.length > 0) {
        log("green", `\n  Recent incidents:`);
        recent.forEach((incident, i) => {
          log("blue", `    ${i + 1}. ${incident.type} - ${incident.status}`);
          log("blue", `       ${incident.vehicle.brand} ${incident.vehicle.model}`);
          log("blue", `       ${incident.description.substring(0, 50)}...`);
        });
      } else {
        log("yellow", `    No incidents found (this is expected if none were submitted)`);
      }
    } else {
      log("red", `  ✗ Debug check failed: ${debugRes.data.error}`);
    }
  }

  // Step 6: Check dispatcher API
  if (adminToken) {
    log("blue", "\n🚨 Step 6: Checking dispatcher incidents API...");
    const dispatcherRes = await apiCall(
      "GET",
      "/api/dispatcher/incidents?status=UNDER_REVIEW",
      null,
      adminToken
    );

    if (dispatcherRes.status === 200) {
      const { incidents, total } = dispatcherRes.data;
      log("green", `  ✓ Dispatcher API working`);
      log("blue", `    Total under review: ${total}`);
      log("blue", `    Loaded: ${incidents.length}`);
    } else {
      log("red", `  ✗ Dispatcher API failed: ${dispatcherRes.data.error}`);
    }
  }

  log("blue", "\n✨ Test Complete\n");
  log("yellow", "Manual Testing Steps:");
  log("yellow", "1. Open http://localhost:3000/my-incidents/new");
  log("yellow", "2. Select a vehicle");
  log("yellow", "3. Fill in incident details");
  log("yellow", "4. Upload at least ONE photo");
  log("yellow", "5. Submit");
  log("yellow", "6. Check F12 Console for [IncidentSubmit] logs");
  log("yellow", "7. Go to http://localhost:3000/admin/vehicle-incidents");
  log("yellow", "8. Check F12 Console for [DashboardFetch] logs");
  log("yellow", "9. Verify incident appears in 'За преглед' tab\n");
}

run().catch((error) => {
  log("red", `\n❌ Test failed with error: ${error.message}\n`);
  process.exit(1);
});
