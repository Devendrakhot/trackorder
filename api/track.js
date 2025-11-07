const dotenv = require("dotenv");
const fetch = require("node-fetch");
const http = require("http");
const url = require("url");

dotenv.config();

const EMAIL = process.env.SHIPROCKET_EMAIL;
const PASSWORD = process.env.SHIPROCKET_PASSWORD;
let token = null;

// 🔹 Get Shiprocket Token
async function getToken() {
  if (token) return token;
  const res = await fetch("https://apiv2.shiprocket.in/v1/external/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const data = await res.json();
  token = data.token;
  console.log("✅ Token fetched");
  return token;
}

// 🔹 Handler (AWB)
async function handler(req, res) {
  const query = url.parse(req.url, true).query;
  const awb = query.awb;

  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*"
  };

  // ✅ DEMO AWB RESPONSE
  if (awb === "1234") {
    console.log("🧩 Using full demo data");

    const demoData = {
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
            updated_time_stamp: "2025-11-06T14:00:00Z"
          }
        ],
        shipment_track_activities: [
          {
            date: "2025-11-01 09:00 AM",
            status: "Shipment Booked",
            location: "Delhi Warehouse"
          },
          {
            date: "2025-11-02 02:00 PM",
            status: "In Transit",
            location: "Agra Distribution Center"
          },
          {
            date: "2025-11-04 08:30 AM",
            status: "Out for Delivery",
            location: "Pune Facility"
          },
          {
            date: "2025-11-06 02:00 PM",
            status: "Delivered",
            location: "Pune, Maharashtra"
          }
        ],
        track_url: "https://track.shiprocket.in/shipment/DEMO123456789",
        qc_response: "",
        is_return: false,
        error: "",
        order_tag: "Demo order for testing full data"
      }
    };

    res.writeHead(200, headers);
    res.end(JSON.stringify(demoData, null, 2));
    return;
  }

  // ✅ LIVE API CALL
  if (!awb) {
    res.writeHead(400, headers);
    res.end(JSON.stringify({ error: "Missing AWB number" }));
    return;
  }

  try {
    const auth = await getToken();
    const response = await fetch(
      `https://apiv2.shiprocket.in/v1/external/courier/track/awb/${awb}`,
      {
        headers: { Authorization: `Bearer ${auth}`, "Content-Type": "application/json" }
      }
    );
    const data = await response.json();
    res.writeHead(200, headers);
    res.end(JSON.stringify(data));
  } catch (error) {
    console.error(error);
    res.writeHead(500, headers);
    res.end(JSON.stringify({ error: "Error fetching tracking data" }));
  }
}

// 🔹 Local Server
if (require.main === module) {
  http.createServer((req, res) => {
    if (req.url.startsWith("/api/track")) handler(req, res);
    else {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not Found");
    }
  }).listen(3000, () =>
    console.log("🚀 API running → http://localhost:3000/api/track?awb=demo")
  );
}

module.exports = { handler };
