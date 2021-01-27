// zoom in to get the result for long-term time series
Map.centerObject(geometry, 17);

// call the function 
var LC_SLIAC = require('users/danielp/LC-SLIAC:LC-SLIAC')
 
// Set parameters
var ROI = geometry,
    startDate = '2019-06-01',
    endDate = '2019-09-01',
    landCoverType = 312; // set 312 for coniferous or 311 for broad-leaved forest

// Additional S1 collection properties can be set // this parameter is optional
/*var S1Collection = ee.ImageCollection('COPERNICUS/S1_GRD')
    .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV'))
    .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VH'))
    .filter(ee.Filter.eq('instrumentMode', 'IW'))
    .filterBounds(ROI)
    .filterDate(startDate, endDate);*/

// boundingBoxSize, referenceAngle, parameters are optional

// Apply the LIA Correction function
var CorrectedCollection = LC_SLIAC.LC_SLIAC(
    ROI,
    startDate,
    endDate,
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
