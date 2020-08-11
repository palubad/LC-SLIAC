// call the function
var LIACorrection = require('users/danielp/LIA_Correction:LIA_Correction_Function')

var coordinates = [20.00875081483153,48.956919483117055] // for study area 1

// Set parameters
var ROI = ee.Geometry.Point(coordinates),
    startDate = '2019-06-01',
    endDate = '2019-09-01',
    landCoverType = 312; // set 312 for coniferous or 311 for broad-leaved forest
// boundingBoxSize, referenceAngle,  parameters are optional

// Apply the LIA Correction function
var CorrectedCollection = LIACorrection.LIACorrection(
                          ROI,
                          startDate,
                          endDate,
                          landCoverType);

var bufferROI = ROI.buffer(20);

var getMeanVHScale = CorrectedCollection.aggregate_mean('VHscale');
var getMeanVVScale = CorrectedCollection.aggregate_mean('VVscale');
var getMeanR2VH = CorrectedCollection.aggregate_mean('VHR2');
var getMeanR2VV = CorrectedCollection.aggregate_mean('VVR2');
var getMean_pValueVH = CorrectedCollection.aggregate_mean('VHpValue');
var getMean_pValueVV = CorrectedCollection.aggregate_mean('VVpValue');
var getMax_pValueVH = CorrectedCollection.aggregate_max('VHpValue');
var getMax_pValueVV = CorrectedCollection.aggregate_max('VVpValue');
var getNumPts = CorrectedCollection.aggregate_mean('numpts');

var RegressionStats = ({
'Scale Mean VH': getMeanVHScale,
'Scale Mean VV': getMeanVVScale,
'R2 Mean VH': getMeanR2VH,
'R2 Mean VV': getMeanR2VV,
'p-value Mean VH': getMean_pValueVH,
'p-value Mean VV':getMean_pValueVV,
'Points number of points': getNumPts,
});

print('Regression statistics', RegressionStats);

var srtm = ee.Image("USGS/SRTMGL1_003"),
    gfc2018 = ee.Image("UMD/hansen/global_forest_change_2018_v1_6"),
    corineDB = ee.Image("COPERNICUS/CORINE/V20/100m/2018");

// Hansen Global forest - Select areas with forest loss from 2000 till 2018
var maskedLoss2018 = gfc2018.updateMask(gfc2018.select('lossyear').lt(1));
// Select pixels with >50% tree cover and mask out region with forest loss
var maskedForest = maskedLoss2018.updateMask(gfc2018.mask(gfc2018).mask(gfc2018).gte(50));

// Load CORINE CLC2018 and use only the selected land cover type
var corine = corineDB.select('landcover');
var corineConiferuous = corine.updateMask(corine.eq(landCoverType));

// Create an intersection of these two land cover databases
var CorineAndHansen = corineConiferuous.updateMask(maskedForest.select('treecover2000')).clip(ROI.buffer(10000).bounds());
//Map.addLayer(corineConiferuous.updateMask(maskedForest.select('treecover2000')), {}, 'CorineAndHansen')

// Convert CorineAndHansen raster to vectors
var forestsInVectors = CorineAndHansen.reduceToVectors();

// change the numberOfImage to get histogram and graph for exact image
// Possibility to use ITERATE function
var list = CorrectedCollection.limit(1).iterate(function(img, container){
  container = ee.List(container);

  // Create 1000 random points in the footprint area
  var randomPoints = ee.FeatureCollection.randomPoints(ROI.buffer(10000).bounds(), 1000, 40);
  var calculatedPoints = CorineAndHansen.reduceRegions({
    collection: randomPoints,
    reducer: ee.Reducer.mean(), 
    scale: 10,
  });
  // Select points which fall into the masked forest region
  var treePoints = calculatedPoints.filter(ee.Filter.notNull(['mean']));
  
  // Create buffer around tree points
  var bufferTreePointsFc = function (feature) {
    return feature.buffer(20);
  };
  var bufferTreePoints = treePoints.map(bufferTreePointsFc);
  
  // Intersection of buffered tree points and forest database
  var selectedPoints = bufferTreePoints.geometry().intersection(forestsInVectors.geometry(), 0.1);
  // Create a feature collection and set the area of intersected buffers as property
  var selectedPointsFinal = ee.FeatureCollection((selectedPoints.geometries().map(function(feature) {
    return ee.Feature(ee.Geometry(feature)).setMulti({area: ee.Geometry(feature).area().round()});
  })));
  
    // Select the area value that occurs the most often
  var mostOftenAreaValue = ee.Number(selectedPointsFinal.aggregate_array('area').reduce(ee.Reducer.mode())).round()
  
  // Select only forest areas which area did not change = area lying totally in the masked forest region
  var selectedPointsFinal2 = selectedPointsFinal.filter(ee.Filter.eq('area', mostOftenAreaValue));

  // Add values of image bands to the "points"
  var pointsWithValue = ee.Image(img).reduceRegions({
    collection: selectedPointsFinal2,
    reducer: ee.Reducer.mean(),
    scale: 10,
  });

return container.add(pointsWithValue);
}, ee.List([]));
// cast the result to ee.List
list = ee.List(list);

// Functions to create arrays containing all the values (LIA, VH, VV and corrected values) of selected points
var arrayLIAfc = function (i) {
  // filter out the points which have no values in the properties
  var getValues = ee.FeatureCollection(list.get(i)).filter(ee.Filter.notNull(['VH', 'VV', 'LIA']));
  var LIA = getValues.aggregate_array('LIA');
  return LIA;
};
var arrayVHfc = function (i) {
  var getValues = ee.FeatureCollection(list.get(i)).filter(ee.Filter.notNull(['VH', 'VV', 'LIA']));
  var VH = getValues.aggregate_array('VH');
  return VH;
};
var arrayVVfc = function (i) {
  var getValues = ee.FeatureCollection(list.get(i)).filter(ee.Filter.notNull(['VH', 'VV', 'LIA']));
  var VV = getValues.aggregate_array('VV');
  return VV;
};
var arrayCorrected_VVfc = function (i) {
  var getValues = ee.FeatureCollection(list.get(i)).filter(ee.Filter.notNull(['VH', 'VV', 'LIA']));
  var Corrected_VV = getValues.aggregate_array('corrected_VV');
  return Corrected_VV;
};
var arrayCorrected_VHfc = function (i) {
  var getValues = ee.FeatureCollection(list.get(i)).filter(ee.Filter.notNull(['VH', 'VV', 'LIA']));
  var Corrected_VH = getValues.aggregate_array('corrected_VH');
  return Corrected_VH;
};

// Apply the functions using "map" and create arrays
var seq = ee.List.sequence(0, 0);
var arrayLIA = seq.map(arrayLIAfc).flatten();
var arrayVH = seq.map(arrayVHfc).flatten();
var arrayVV = seq.map(arrayVVfc).flatten();
var arrayCorrected_VV = seq.map(arrayCorrected_VVfc).flatten();
var arrayCorrected_VH = seq.map(arrayCorrected_VHfc).flatten();

// Create x,y arrays from lists of values
var VHxLIA = arrayLIA.zip(arrayVH);
var VVxLIA = arrayLIA.zip(arrayVV);
var Corrected_VHxLIA = arrayLIA.zip(arrayCorrected_VH);
var Corrected_VVxLIA = arrayLIA.zip(arrayCorrected_VV);

var VHExtremes = arrayVH.sort();
var VVExtremes = arrayVV.sort();
var LIAExtremes = arrayLIA.sort();
var VHCorrectedExtremes = arrayCorrected_VH.sort();
var VVCorrectedExtremes = arrayCorrected_VV.sort();
var varianceVH = arrayVH.reduce(ee.Reducer.variance());
var varianceVV = arrayVV.reduce(ee.Reducer.variance());
var varianceCorrectedVH = arrayCorrected_VH.reduce(ee.Reducer.variance());
var varianceCorrectedVV = arrayCorrected_VV.reduce(ee.Reducer.variance());
var stdevVH = arrayVH.reduce(ee.Reducer.stdDev());
var stdevVV = arrayVV.reduce(ee.Reducer.stdDev());
var stdevCorrectedVH = arrayCorrected_VH.reduce(ee.Reducer.stdDev());
var stdevCorrectedVV = arrayCorrected_VV.reduce(ee.Reducer.stdDev());

var perc75VV = ee.Number(arrayVV.reduce(ee.Reducer.percentile([75])));
var perc25VV = ee.Number(arrayVV.reduce(ee.Reducer.percentile([25])));
var lowerFenceVV = perc25VV.subtract(ee.Number(1.5).multiply(perc75VV.subtract(perc25VV)));
var upperFenceVV = perc75VV.add(ee.Number(1.5).multiply(perc75VV.subtract(perc25VV)));
var CorrPerc75VV = ee.Number(arrayCorrected_VV.reduce(ee.Reducer.percentile([75])));
var CorrPerc25VV = ee.Number(arrayCorrected_VV.reduce(ee.Reducer.percentile([25])));
var lowerFenceCorrVV = CorrPerc25VV.subtract(ee.Number(1.5).multiply(CorrPerc75VV.subtract(CorrPerc25VV)));
var upperFenceCorrVV = CorrPerc75VV.add(ee.Number(1.5).multiply(CorrPerc75VV.subtract(CorrPerc25VV)));

var perc75VH = ee.Number(arrayVH.reduce(ee.Reducer.percentile([75])));
var perc25VH = ee.Number(arrayVH.reduce(ee.Reducer.percentile([25])));
var lowerFenceVH = perc25VH.subtract(ee.Number(1.5).multiply(perc75VH.subtract(perc25VH)));
var upperFenceVH = perc75VH.add(ee.Number(1.5).multiply(perc75VH.subtract(perc25VH)));
var CorrPerc75VH = ee.Number(arrayCorrected_VH.reduce(ee.Reducer.percentile([75])));
var CorrPerc25VH = ee.Number(arrayCorrected_VH.reduce(ee.Reducer.percentile([25])));
var lowerFenceCorrVH = CorrPerc25VH.subtract(ee.Number(1.5).multiply(CorrPerc75VH.subtract(CorrPerc25VH)));
var upperFenceCorrVH = CorrPerc75VH.add(ee.Number(1.5).multiply(CorrPerc75VH.subtract(CorrPerc25VH)));

var betweenFencesVV = arrayVV.filter(ee.Filter.and(ee.Filter.greaterThan('item', lowerFenceVV), 
                      ee.Filter.lessThan('item', upperFenceVV)));
var betweenFencesVH = arrayVH.filter(ee.Filter.and(ee.Filter.greaterThan('item', lowerFenceVH), 
                      ee.Filter.lessThan('item', upperFenceVH)));
var betweenFencesCorrVV = arrayCorrected_VV.filter(ee.Filter.and(ee.Filter.greaterThan('item', lowerFenceCorrVV), 
                      ee.Filter.lessThan('item', upperFenceCorrVV)));
var betweenFencesCorrVH = arrayCorrected_VH.filter(ee.Filter.and(ee.Filter.greaterThan('item', lowerFenceCorrVH), 
                      ee.Filter.lessThan('item', upperFenceCorrVH)));



var CorrectionStats = ({
'VH min': VHExtremes.get(0), 
'VH max' : VHExtremes.get(-1),
'VV lower fence': lowerFenceVV,
'VV upper fence': upperFenceVV,
'VV lower fence Corrected': lowerFenceCorrVV,
'VV upper fence Corrected': upperFenceCorrVV,
'VV variance': betweenFencesVV.reduce(ee.Reducer.variance()),
'VV variance Corr': betweenFencesCorrVV.reduce(ee.Reducer.variance()),
'VV Stdev': betweenFencesVV.reduce(ee.Reducer.stdDev()),
'VV Stdev Corr': betweenFencesCorrVV.reduce(ee.Reducer.stdDev()),
'VV max-min': ee.Number(betweenFencesVV.sort().get(-1)).subtract(ee.Number(betweenFencesVV.sort().get(0))),
'VV max-min Corr': ee.Number(betweenFencesCorrVV.sort().get(-1)).subtract(ee.Number(betweenFencesCorrVV.sort().get(0))),
'VH lower fence': lowerFenceVH,
'VH upper fence': upperFenceVH,
'VH lower fence Corrected': lowerFenceCorrVH,
'VH upper fence Corrected': upperFenceCorrVH,
'VH variance': betweenFencesVH.reduce(ee.Reducer.variance()),
'VH variance Corr': betweenFencesCorrVH.reduce(ee.Reducer.variance()),
'VH Stdev': betweenFencesVH.reduce(ee.Reducer.stdDev()),
'VH Stdev Corr': betweenFencesCorrVH.reduce(ee.Reducer.stdDev()),
'VH max-min': ee.Number(betweenFencesVH.sort().get(-1)).subtract(ee.Number(betweenFencesVH.sort().get(0))),
'VH max-min Corr': ee.Number(betweenFencesCorrVH.sort().get(-1)).subtract(ee.Number(betweenFencesCorrVH.sort().get(0))),
'range VH': ee.Number(VHExtremes.get(-1)).subtract(ee.Number(VHExtremes.get(0))),
'VV min': VVExtremes.get(0), 
'VV max' : VVExtremes.get(-1),
'range VV': ee.Number(VVExtremes.get(-1)).subtract(ee.Number(VVExtremes.get(0))),
'LIA min': LIAExtremes.get(0), 
'LIA max' : LIAExtremes.get(-1),
'range LIA': ee.Number(LIAExtremes.get(-1)).subtract(ee.Number(LIAExtremes.get(0))),
'Corrected VH min': VHCorrectedExtremes.get(0), 
'Corrected VH max' : VHCorrectedExtremes.get(-1),
'range Corrected VH': ee.Number(VHCorrectedExtremes.get(-1)).subtract(ee.Number(VHCorrectedExtremes.get(0))),
'Corrected VV min': VVCorrectedExtremes.get(0), 
'Corrected VV max' : VVCorrectedExtremes.get(-1),
'range Corrected VV': ee.Number(VVCorrectedExtremes.get(-1)).subtract(ee.Number(VVCorrectedExtremes.get(0))),
'variance VH': varianceVH,
'variance VV': varianceVV,
'variance Corrected VH': varianceCorrectedVH,
'variance Corrected VV': varianceCorrectedVV,
'stdev VH': stdevVH,
'stdev VV': stdevVV,
'stdev Corrected VH': stdevCorrectedVH,
'stdev Corrected VV': stdevCorrectedVV
});

print('Overall Statistics', CorrectionStats);


///////////////////////////////////////////////////////////////////////

// Function to create a feature collection from arrays with attributes in properties
// Collection of individual points their values in properties
var getCollection = function (j) {
  var FeatureColl1 = new ee.FeatureCollection([]);
  var getLIA = arrayLIA.get(j);
  var getVV = arrayVV.get(j);
  var getVH = arrayVH.get(j);
  var getCorrected_VV = arrayCorrected_VV.get(j);
  var getCorrected_VH = arrayCorrected_VH.get(j);
  var feature = ee.Feature(null, {LIA: getLIA, VV: getVV, VH: getVH, corrected_VV: getCorrected_VV, corrected_VH: getCorrected_VH});
  
  return feature;
};

// Apply the function and create a feature collection
var seq2 = ee.List.sequence(0, ee.Number(arrayVV.size()).subtract(1));
var pointCollection = ee.FeatureCollection(seq2.map(getCollection));


///////////////////////////////////////////////////////////////////////

// Graphs

var selected = pointCollection.limit(pointCollection.size());
//print(selected, 'selected')
var originalValuesChartVH = ui.Chart.feature.byFeature(selected, 'LIA', 'VH')
  .setChartType('ScatterChart')
  .setOptions({
    title: 'Scatterplot of original VH values',
    trendlines: {0: {
    type: 'linear',
    color: 'CC0000',
    showR2: true,
    visibleInLegend: true
    }}
  });

var correctedRegressionChartVH = ui.Chart.feature.byFeature(selected, 'LIA', 'corrected_VH')
  .setChartType('ScatterChart')
  .setOptions({
    title: 'Scatterplot of corrected VH values',
    trendlines: {0: {
    type: 'linear',
    color: 'CC0000',
    showR2: true,
    visibleInLegend: true
    }}
  });

var originalValuesChartVV = ui.Chart.feature.byFeature(selected, 'LIA', 'VV')
  .setChartType('ScatterChart')
  .setOptions({
    title: 'Scatterplot of original VV values',
    trendlines: {0: {
    type: 'linear',
    color: 'CC0000',
    showR2: true,
    visibleInLegend: true
    }}
  });

var correctedRegressionChartVV = ui.Chart.feature.byFeature(selected, 'LIA', 'corrected_VV')
  .setChartType('ScatterChart')
  .setOptions({
    title: 'Scatterplot of corrected VV values',
    trendlines: {0: {
    type: 'linear',
    color: 'CC0000',
    showR2: true,
    visibleInLegend: true
    }}
  });

// Check the Gaussian distribution of data - print histogram
var histogram = ui.Chart.feature.histogram(selected, 'corrected_VV');

// Add charts to the console
var TSChart = ui.Chart.image.series({
  imageCollection: CorrectedCollection.select(['VV', 'VH', 'corrected_VV', 'corrected_VH']),
  region: bufferROI,
  reducer: ee.Reducer.mean(),
  scale: 10,
}).setOptions({
    title: 'Time-series of corrected and uncorrected data'
});

var LIAChart = ui.Chart.image.series({
  imageCollection: CorrectedCollection.select('LIA'),
  region: bufferROI,
  reducer: ee.Reducer.mean(),
  scale: 10,
}).setOptions({
    title: 'LIA over time'
});

//Print charts
print(originalValuesChartVH);
print(correctedRegressionChartVH);
print(originalValuesChartVV);
print(correctedRegressionChartVV);
print(histogram);
print(TSChart);
print(LIAChart);


// Prepare data and export the values
var geth = function (img) {
  var values = img.select(['LIA', 'corrected_VH', 'VH', 'corrected_VV', 'VV']).reduceRegion({
    //collection: bufferROI,
    reducer: ee.Reducer.mean(),
    geometry: bufferROI,
    scale: 10,
  });
    return ee.Feature(null, {Date: ee.Date(img.get('system:time_start')).format('YYYY-MM-dd'), 
    LIA: values.get('LIA'), 
    linear_VH: values.get('corrected_VH'), 
    linear_VV: values.get('corrected_VV'),
    VV: values.get('VH'), 
    VH: values.get('VV')});
};

var toExport = CorrectedCollection.map(geth);

// // Export OLNY values to CSV table
// Export.table.toDrive({
//   collection: selected,
//   folder: 'Test_Folder',
//   description: '1',
//   fileFormat: 'CSV',
//   selectors: 'LIA,corrected_VH,corrected_VV,VV,VH'
// });
