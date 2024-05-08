import axios from 'axios';
import Papa from 'papaparse';

const DEALERDOTCOM_URL = "https://feeds.amp.auto/feeds/coxautomotive/dealerdotcom.csv";
const VINSOLUTIONS_BASE_URL = "https://feeds.amp.auto/feeds/vinsolutions/";
const GM_API_BASE_URL = "https://cws.gm.com/vs-cws/vehshop/v2/vehicle";
const POSTAL_CODE = "48640";  // Example postal code, adjust as necessary

const headers = {
  "authority": "cws.gm.com",
  "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
  "accept-language": "en-US,en;q=0.9",
  "cache-control": "max-age=0",
  "sec-ch-ua": '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"Windows"',
  "sec-fetch-dest": "document",
  "sec-fetch-mode": "navigate",
  "sec-fetch-site": "none",
  "sec-fetch-user": "?1",
  "upgrade-insecure-requests": "1",
  "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
};

async function downloadCsv(url) {
  try {
    const response = await axios.get(url);
    return Papa.parse(response.data, { header: true, skipEmptyLines: true });
  } catch (error) {
    console.error("Failed to download or parse CSV", error);
    return null;
  }
}

async function getVehicleData(vin) {
  const url = `${GM_API_BASE_URL}?vin=${vin}&postalCode=${POSTAL_CODE}&locale=en_US`;
  try {
    const response = await axios.get(url, { headers });
    return response.data;
  } catch (error) {
    console.error("API request to GM failed for VIN: " + vin, error);
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { selectedFilename, selectedType, selectedDealerId, enableApiCall } = req.body;

    const dealerdotcomData = await downloadCsv(DEALERDOTCOM_URL);
    const vinsolutionsData = await downloadCsv(`${VINSOLUTIONS_BASE_URL}${selectedFilename}`);

    if (!dealerdotcomData || !vinsolutionsData) {
      res.status(500).json({ error: 'Failed to download necessary CSV data' });
      return;
    }

    const filteredVinsolutionsData = selectedType !== 'All' ? vinsolutionsData.data.filter(v => v.Type === selectedType) : vinsolutionsData.data;
    const filteredDealerdotcomData = dealerdotcomData.data.filter(d => d.dealer_id === selectedDealerId && d.type === 'Used');

    const vinsolutionsVins = new Set(filteredVinsolutionsData.map(v => v.VIN));
    const dealerdotcomVins = new Set(filteredDealerdotcomData.map(d => d.vin));

    let results = [];

    if (enableApiCall) {
      const uniqueVins = new Set([...vinsolutionsVins, ...dealerdotcomVins]);
      for (let vin of uniqueVins) {
        const apiData = await getVehicleData(vin);
        if (apiData) {
          // Checking for recall information
          if ("mathBox" in apiData && "recallInfo" in apiData["mathBox"] && "This vehicle is temporarily unavailable" in apiData["mathBox"]["recallInfo"]) {
            results.push({ VIN: vin, Result: "Vehicle with Recall" });
            continue;
          }

          // Checking for inventory status
          if ("inventoryStatus" in apiData) {
            const inventory_status = apiData["inventoryStatus"].get("name");
            if (inventory_status) {
              if (inventory_status === "Rtl_Intrans" && dealerdotcomVins.has(vin)) {
                results.push({ VIN: vin, Result: "In Transit - Not expected in HomeNet" });
              } else if (inventory_status === "EligRtlStkCT") {
                results.push({ VIN: vin, Result: "Courtesy Vehicle" });
              } else {
                results.push({ VIN: vin, Result: `Other Inventory Status: ${inventory_status}` });
              }
            } else {
              if (dealerdotcomVins.has(vin)) {
                results.push({ VIN: vin, Result: "Exclusive to Dealer.com Website" });
              } else {
                results.push({ VIN: vin, Result: "Exclusive to HomeNet" });
              }
            }
          }
        } else {
          results.push({ VIN: vin, Result: 'API request failed' });
        }
      }
    }

    res.status(200).json({ results });
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
