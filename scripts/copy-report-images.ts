import * as fs from 'fs';
import * as path from 'path';

const srcDir = path.join(process.cwd(), 'resources', 'images');
const destDir = path.join(process.cwd(), 'public', 'images', 'reports');

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

const files = fs.readdirSync(srcDir);
console.log(`Found ${files.length} files in ${srcDir}`);

// Copy all files
for (const file of files) {
  const srcPath = path.join(srcDir, file);
  if (!fs.statSync(srcPath).isFile()) continue;

  const destPath = path.join(destDir, file);
  fs.copyFileSync(srcPath, destPath);
}

// Create well-named standardized aliases for reports
const ALIASES: Record<string, string> = {
  // Road & Potholes
  'road_pothole_1.webp': 'bad-road-cracked-asphalt-potholes-260nw-2483144747.webp',
  'road_pothole_2.webp': 'damaged-road-potholes-india-260nw-696329260.webp',
  'road_pothole_3.webp': 'mumbai-india-vehicles-make-their-way-on-potholes-ridden-road-on-july-11-2018-in-mumbai-india.webp',
  'road_pothole_4.webp': 'damaged-kolkata-city-street-during-monsoon-season.webp',
  'road_repaired_1.webp': 'view-empty-red-road-morning-260nw-1776022208.webp',
  'road_repaired_2.webp': 'Chandigarh.jpg',

  // Garbage & Sanitation
  'garbage_overflow_1.webp': 'Paharganj-garbage.webp',
  'garbage_overflow_2.webp': 'GB-Road-garbage.webp',
  'garbage_overflow_3.webp': 'a-ragpicker-collects-plastic-cans-at-a-landfill-in-hyderabad-on-september-6-2024.webp',
  'garbage_overflow_4.webp': 'jaipur-rajasthan-india-september-garbage-lying-road-near-gada-park-purani-basti-all-over-cow-stands-nearby-478316923.webp',
  'garbage_cleared_1.webp': 'mumbai-india-sweeper-bmc-cleanliness-drive-marathi-actor-atul-parchure-assistant-municipal.webp',
  'garbage_cleared_2.webp': 'Recycling-waste-Management-NGO-Earth5R-Mumbai-CSR-ESG-Sustainability-1024x576.webp',

  // Sewage & Drainage
  'sewage_overflow_1.webp': 'blocked-drainage-issue-in-india.webp',
  'sewage_overflow_2.webp': 'Wastewater (1).webp',
  'sewage_overflow_3.webp': 'an-aerial-view-of-a-slum-cluster-showing-a-sewage-drain-canal-full-of-garbage-at-taimoor-nagar.webp',
  'sewage_overflow_4.webp': 'this-aerial-photo-taken-on-october-4-2019-shows-a-polluted-sewage-drain-canal-covered-in.webp',

  // School Infrastructure
  'school_damaged_1.webp': 'Damaged-classroon.webp',
  'school_repaired_1.webp': 'new-delhi-india-government-school-students-during-a-parent-teacher-meeting-at-govt-sarvodya.webp',

  // Health Clinic
  'health_damaged_1.webp': 'historic-government-city-hospital-building-nizamia-general-shahalibanda-road-hyderabad-india-205710825.webp',
  'health_repaired_1.webp': 'nurses-provide-medical-care-to-a-patient-at-a-special-ward-for-heat-stroke-patients-at-a.webp',

  // Other Civic Infrastructure
  'sidewalk_broken_1.webp': 'depositphotos_240784370-stock-photo-puducherry-india-december-circa-2018.webp',
  'unrelated_clean_road.webp': 'view-empty-red-road-morning-260nw-1776022208.webp',
};

for (const [alias, source] of Object.entries(ALIASES)) {
  const sourcePath = path.join(destDir, source);
  if (fs.existsSync(sourcePath)) {
    fs.copyFileSync(sourcePath, path.join(destDir, alias));
    console.log(`Aliased: ${alias} <- ${source}`);
  } else {
    console.warn(`Source not found for alias: ${source}`);
  }
}

console.log('Finished copying and creating aliases.');
