/**
 * 🚚 Shiprocket Tracking API (Serverless + Local Compatible)
 * ----------------------------------------------------------
 * ✅ Works locally (http://localhost:3000/api/track?awb=1234)
 * ✅ Works on Netlify (https://your-site.netlify.app/api/track?awb=1234)
 * ✅ Supports demo tracking (awb=1234)
 * ✅ Fetches live data via Shiprocket API with token caching
 * ✅ Handles missing, invalid, or failed responses gracefully
 */

const dotenv = require("dotenv");
const fetch = require("node-fetch");
const http = require("http");
const url = require("url");

dotenv.config();

const EMAIL = process.env.SHIPROCKET_EMAIL;
const PASSWORD = process.env.SHIPROCKET_PASSWORD;
let token = null;
let tokenFetchedAt = null;

// 🔹 Get Shiprocket Token (cached for ~1 hour)
async function getToken(forceRefresh = false) {
  const TOKEN_EXPIRY = 55 * 60 * 1000; // 55 min
  const now = Date.now();

  if (!forceRefresh && token && tokenFetchedAt && now - tokenFetchedAt < TOKEN_EXPIRY) {
    return token;
  }

  console.log("🔐 Fetching new Shiprocket token...");
  const res = await fetch("https://apiv2.shiprocket.in/v1/external/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });

  const data = await res.json();
  if (!data.token) throw new Error("❌ Failed to fetch token: " + JSON.stringify(data));

  token = data.token;
  tokenFetchedAt = now;
  console.log("✅ Token refreshed successfully");
  return token;
}

// 🔹 DEMO DATA (for testing)
function getDemoData() {
  return {
    tracking_data: {
      track_status: 1,
      shipment_status: 7,
      shipment_track: [
        {
          id: 101,
          awb_code: "DEMO123456789",
          courier_company_id: 21,
          shipment_id: 556677,
          order_id: 123456,
          pickup_date: "2025-11-01 09:30 AM",
          delivered_date: "2025-11-06 02:00 PM",
          weight: "1.25 KG",
          packages: 1,
          current_status: "Delivered",
          delivered_to: "Ramesh Sharma",
          destination: "Pune, Maharashtra",
          consignee_name: "Ramesh Sharma",
          origin: "Delhi, India",
          courier_agent_details: "Handled by Delhivery Express",
          courier_name: "Delhivery Express",
          edd: "2025-11-06",
          pod: "Received",
          pod_status: "Delivered successfully",
          rto_delivered_date: "",
          return_awb_code: "",
          updated_time_stamp: "2025-11-06T14:00:00Z",
        },
      ],
      shipment_track_activities: [
        { date: "2025-11-01 09:00 AM", status: "Shipment Booked", location: "Delhi Warehouse" },
        { date: "2025-11-02 02:00 PM", status: "In Transit", location: "Agra Distribution Center" },
        { date: "2025-11-04 08:30 AM", status: "Out for Delivery", location: "Pune Facility" },
        { date: "2025-11-06 02:00 PM", status: "Delivered", location: "Pune, Maharashtra" },
      ],
      track_url: "https://track.shiprocket.in/shipment/DEMO123456789",
      qc_response: "",
      is_return: false,
      error: "",
      order_tag: "Demo order for testing full data",
    },
  };
}

// 🔹 Main Handler
async function handler(req, res) {
  const query = url.parse(req.url, true).query;
  const awb = query.awb;

  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  };

  // 🧾 Missing AWB
  if (!awb) {
    res.writeHead(400, headers);
    res.end(JSON.stringify({ error: "Missing AWB number" }));
    return;
  }

  // 🧩 Demo Mode
  if (awb === "1234" || awb.toLowerCase().includes("demo")) {
    console.log("🧩 Returning demo tracking data");
    res.writeHead(200, headers);
    res.end(JSON.stringify(getDemoData(), null, 2));
    return;
  }

  // 🚀 Live API Mode
  try {
    const auth = await getToken();
    const response = await fetch(
      `https://apiv2.shiprocket.in/v1/external/courier/track/awb/${awb}`,
      { headers: { Authorization: `Bearer ${auth}`, "Content-Type": "application/json" } }
    );

    const data = await response.json();

    // Handle empty or error responses
    if (
      data.tracking_data?.error ||
      !data.tracking_data?.shipment_track ||
      data.tracking_data.shipment_track.length === 0
    ) {
      console.warn(`⚠️ No shipment found for AWB: ${awb}`);
      res.writeHead(404, headers);
      res.end(JSON.stringify({ error: "No tracking number found or invalid AWB" }));
      return;
    }

    res.writeHead(200, headers);
    res.end(JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("🚨 Error fetching tracking info:", error.message);
    res.writeHead(500, headers);
    res.end(JSON.stringify({ error: "Internal Server Error" }));
  }
}

// 🔹 Local Testing Server
if (require.main === module) {
  http
    .createServer((req, res) => {
      if (req.url.startsWith("/api/track")) handler(req, res);
      else {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Endpoint not found" }));
      }
    })
    .listen(3000, () =>
      console.log("🚀 Server running → http://localhost:3000/api/track?awb=1234")
    );
}

// Export for Netlify
module.exports = { handler };
