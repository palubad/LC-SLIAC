var geometry = 
    /* color: #d63000 */
    /* displayProperties: [
      {
        "type": "rectangle"
      }
    ] */
    ee.Geometry.Polygon(
        [[[107.82462352608354, 16.089884865998176],
          [107.82462352608354, 16.089276659606156],
          [107.82525652741106, 16.089276659606156],
          [107.82525652741106, 16.089884865998176]]], null, false);

// zoom in to get the result for long-term time series
Map.centerObject(geometry, 17);

// call the function 
var LC_SLIAC_global = require('users/danielp/LC-SLIAC:LC-SLIAC_global')
 
// Set parameters
var ROI = geometry,
    startDate = '2018-06-01',
    endDate = '2018-09-01',
    year = 18,
    landCoverType = 112; // 111, 112, 113 or 114 - check the CGLC documentation

// Additional S1 collection properties can be set // this parameter is optional
/*var S1Collection = ee.ImageCollection('COPERNICUS/S1_GRD')
    .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV'))
    .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VH'))
    .filter(ee.Filter.eq('instrumentMode', 'IW'))
    .filterBounds(ROI)
    .filterDate(startDate, endDate);*/

// boundingBoxSize, referenceAngle, parameters are optional

// Apply the LIA Correction function
var CorrectedCollection = LC_SLIAC_global.LC_SLIAC_global(
    ROI,
    startDate,
    endDate,
    year,
    landCoverType
    //S1Collection
);

// Print the resulted Sentinel-1 Image Collection
print(CorrectedCollection);

// Create Chart of time series before and after correction
var TSChart = ui.Chart.image.series({
    imageCollection: CorrectedCollection.select(['VV', 'VH', 'corrected_VV', 'corrected_VH']),
    region: ROI,
    reducer: ee.Reducer.mean(),
    scale: 10,
}).setOptions({
    title: 'Time-series of corrected and uncorrected data'
});

// display the TS chart in the Console
print(TSChart);
