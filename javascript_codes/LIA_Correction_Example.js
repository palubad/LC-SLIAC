// call the function
var LIACorrection = require('users/danielp/LIA_Correction:LIA_Correction_Function')

// polygon drawed into the Map using the Geometry Tools
var geometry = ee.Geometry.Polygon(
    [
        [
            [19.67749665195573, 49.01504703386079],
            [19.67749665195573, 49.014104117442386],
            [19.67882702762712, 49.014104117442386],
            [19.67882702762712, 49.01504703386079]
        ]
    ], null, false);

// Set parameters
var ROI = geometry,
    startDate = '2019-06-01',
    endDate = '2019-09-01',
    landCoverType = 312; // set 312 for coniferous or 311 for broad-leaved forest
// boundingBoxSize, referenceAngle,  parameters are optional

// Apply the LIA Correction function
var CorrectedCollection = LIACorrection.LIACorrection(
    ROI,
    startDate,
    endDate,
    landCoverType
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
