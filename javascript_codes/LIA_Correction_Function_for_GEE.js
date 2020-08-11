var LIACorrection = function (ROI,
                              startDate,
                              endDate,
                              landCoverType,
                              boundingBoxSize, 
                              referenceAngle,
                              SARCollection,
                              acquisitionMode) {

// set the optional parameters of the function
boundingBoxSize = boundingBoxSize || 10000; // 10000 for a 20x20 km bouding box
referenceAngle = referenceAngle || 9999; // 9999 to calculate with the mean angle
acquisitionMode = acquisitionMode || 'IW';
SARCollection = SARCollection || S1Collection;

// select the Sentinel-1 Image Collection
var S1Collection = ee.ImageCollection('COPERNICUS/S1_GRD')
                  .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV'))
                  .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VH'))
                  .filter(ee.Filter.eq('instrumentMode', acquisitionMode))
                  .filterBounds(ROI)
                  .filterDate(startDate, endDate);

////////////////////////////////////////////////////////////////////////////////////////////

var srtm = ee.Image("USGS/SRTMGL1_003"),
    gfc2018 = ee.Image("UMD/hansen/global_forest_change_2018_v1_6"),
    corineDB = ee.Image("COPERNICUS/CORINE/V20/100m/2018");  

// Create 20x20 km bounding box around the selected point 
var bufferForRndData = (ROI.buffer(boundingBoxSize)).bounds();
//Map.addLayer(bufferForRndData, {}, 'bufferForRndData')

// Create separate ascending and descending collections
var sentinel1ASCDB = S1Collection
                     .filter(ee.Filter.eq('orbitProperties_pass', 'ASCENDING'));
var sentinel1DESCDB = S1Collection
                     .filter(ee.Filter.eq('orbitProperties_pass', 'DESCENDING'));
                    
// Calculate aspect and slope from DEM, in radians for further calculations
var aspect = ee.Terrain.aspect(srtm).multiply(Math.PI/180).clip(bufferForRndData);
var slope = ee.Terrain.slope(srtm).multiply(Math.PI/180).clip(bufferForRndData);

//////////////////Function to CREATE LIA for ASCENDING images//////////////////

// Function to calculate true azimuth direction for  the near range image edge
var createLIAASC = function (img) {
  
  // Reproject aspect and slope to the coordinate system of S-1 image
  // Resample using nearest neighbour method
  var aspectReproj = aspect.reproject({
      crs: img.select('VV').projection()
    });
  var slopeReproj = slope.reproject({
      crs: img.select('VV').projection()
    });

  // Get the coords as a transposed array --> [[x,y]] to [x] a [y]
  // get(0) for get the first list, beause it's a list of lists // img.geometry() = 'system:footprint'
  // based on Guido Lemoine's script available at https://code.earthengine.google.com/f358cffefd45e09d162eb58821e83205
  var coords = ee.Array(img.geometry().coordinates().get(0)).transpose();
  var crdLons = ee.List(coords.toList().get(0)); // get x coordinates
  var crdLats = ee.List(coords.toList().get(1)); // get y coordinates
  var minLon = crdLons.sort().get(0); // get min/maxes
  var maxLon = crdLons.sort().get(-1);
  var minLat = crdLats.sort().get(0);
  var maxLat = crdLats.sort().get(-1);

  // Get the coordinates of the most southwest and most northwest point of the image
  // get the X coordinate of the min Y point and subtract the minX from that to get the difference
  var Xdiff = ee.Number(crdLons.get(crdLats.indexOf(minLat))).subtract(minLon);
  
  // get the Y coordinate of the min X point and subtract the minY from that to get the difference
  var Ydiff = ee.Number(crdLats.get(crdLons.indexOf(minLon))).subtract(minLat);

  // Now we have a right triangle --> just use the trigonometric function
  var azimuth = (Ydiff.divide(Xdiff)).atan().multiply(180/Math.PI).add(270.0);
  // azimuth = 360 - (90 - x)   -->   x + 270!

  // Then calculate the viewing angle 
  var azimuthViewIMG = ee.Image(azimuth.subtract(270)).rename('AzimuthLook_ASC');
  
  // Define the Radar incidence angle
  var s1_inc = img.select('angle').multiply(Math.PI/180);
  
  // Calculation of Local incidence angle according to Teillet et al. (1985), Hinse et al. (1988) and Castel et. al (2010)
  var LIAimg = ((slopeReproj.cos().multiply(s1_inc.cos()))
  .subtract(slopeReproj.sin().multiply(s1_inc.sin().multiply((aspectReproj.subtract(azimuthViewIMG.multiply(Math.PI/180))).cos())))).acos()
  .clip(ee.Geometry.Polygon(img.geometry().coordinates().get(0))).multiply(180/Math.PI).rename('LIA');

  return img.addBands([LIAimg]).setMulti({azimuthViewIMG: azimuthViewIMG});

};

//////////////////Function to CREATE LIA for DESCENDING images//////////////////

var createLIADESC = function (img) {
  
  var aspectReproj = aspect.reproject({
      crs: img.select('VV').projection()
    });
  var slopeReproj = slope.reproject({
      crs: img.select('VV').projection()
    });
  
  // Get the coords as a transposed array --> [[x,y]] to [x] a [y]
  // get(0) for get the first list, beause it's a list of lists // img.geometry() = 'system:footprint'
  // based on Guido Lemoine's script available at https://code.earthengine.google.com/f358cffefd45e09d162eb58821e83205
  var coords = ee.Array(img.geometry().coordinates().get(0)).transpose();
  var crdLons = ee.List(coords.toList().get(0)); // get x coordinates
  var crdLats = ee.List(coords.toList().get(1)); // get y coordinates
  var minLon = crdLons.sort().get(0); // get min/maxes
  var maxLon = crdLons.sort().get(-1);
  var minLat = crdLats.sort().get(0);
  var maxLat = crdLats.sort().get(-1);

  //Get the coordinates of the most southeast and most northeast point of the image
  // get the X coordinate of the min Y point and subtract the max X from that to get the difference
  var Xdiff = ee.Number(maxLon).subtract(ee.Number(crdLons.get(crdLats.indexOf(minLat))));
  
  // get the Y coordinate of the min X point and subtract the minY from that to get the difference
  var Ydiff = ee.Number(crdLats.get(crdLons.indexOf(maxLon))).subtract(minLat);
  
  // Now we have a right triangle --> just use the trigonometric functions
  var azimuth = ee.Number(90).subtract((Ydiff.divide(Xdiff)).atan().multiply(180/Math.PI)).add(180);
  // azimuth = 90 - azimuth + 180

  // Then calculate the azimuth viewing angle 
  var azimuthViewIMG = ee.Image(azimuth.add(90)).rename('AzimuthLook_Desc');
  
  // Define the Radar incidence angle 
  var s1_inc = img.select('angle').multiply(Math.PI/180);
  
  // Calculation of Local incidence angle according to Teillet et al. (1985), Hinse et al. (1988) and Castel et. al (2010)
  var LIAimg = ((slopeReproj.cos().multiply(s1_inc.cos()))
  .subtract(slopeReproj.sin().multiply(s1_inc.sin().multiply((aspectReproj.subtract(azimuthViewIMG.multiply(Math.PI/180))).cos())))).acos()
  .clip(ee.Geometry.Polygon(img.geometry().coordinates().get(0))).multiply(180/Math.PI).rename('LIA');

  return img.addBands([LIAimg]).setMulti({azimuthViewIMG: azimuthViewIMG});
};

// Apply the function to the Sentinel1 collection
var LIAImgASC = sentinel1ASCDB.map(createLIAASC);
var LIAImgDESC = sentinel1DESCDB.map(createLIADESC);

// Merge databases of Descending and Ascending images, sort by time
var LIAImages = (LIAImgDESC.merge(LIAImgASC)).sort('system:time_start');

////////////////////////////////////////////////////////////////////////

// Create a forest mask for data
// Hansen Global forest - Select areas with forest loss from 2000 till 2018
var maskedLoss2018 = gfc2018.updateMask(gfc2018.select('lossyear').lt(1));
// Select pixels with >50% tree cover and mask out region with forest loss
var maskedForest = maskedLoss2018.updateMask(gfc2018.mask(gfc2018).mask(gfc2018).gte(50));

// Load CORINE CLC2018 and use only the selected land cover type
var corine = corineDB.select('landcover');
var corineConiferuous = corine.updateMask(corine.eq(landCoverType));

// Create an intersection of these two land cover databases
var CorineAndHansen = corineConiferuous.updateMask(maskedForest.select('treecover2000')).clip(bufferForRndData);
//Map.addLayer(corineConiferuous.updateMask(maskedForest.select('treecover2000')), {}, 'CorineAndHansen')

// Convert CorineAndHansen raster to vectors
var forestsInVectors = CorineAndHansen.reduceToVectors();

////////////////////////////////////////////////////////////////////////

// Get regression parameters as image property
var getRegressionParamaters = function (img) {
  
  // Create 1000 random points in the 20x20km bounding box
  var randomPoints = ee.FeatureCollection.randomPoints(bufferForRndData, 1000, 40);
  var calculatedPoints = CorineAndHansen.reduceRegions({
    collection: randomPoints,
    reducer: ee.Reducer.mean(), 
    scale: 10,
  });
  // Select points which fall into the masked forest region
  var treePoints = calculatedPoints.filter(ee.Filter.notNull(['mean']));
  
  // Create a 20m buffer around selected tree points
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
  
  // Filter out points, which have Null values for any of the properties
  var getValues = ee.FeatureCollection(pointsWithValue.filter(ee.Filter.notNull(['VH', 'VV', 'LIA'])));
    
  // Functions to create arrays containing all the values (LIA, VH and VV) of selected points
  var LIA = getValues.aggregate_array('LIA');
  var VH = getValues.aggregate_array('VH');
  var VV = getValues.aggregate_array('VV');
  
  // Create x,y arrays from lists of values
  var VHxLIA = LIA.zip(VH);
  var VVxLIA = LIA.zip(VV);
  
  // Add regression values and number of used points to the image properties
  var VHregressionValues = VHxLIA.reduce(ee.Reducer.linearFit());
  var VVregressionValues = VVxLIA.reduce(ee.Reducer.linearFit());
  var VHscale = ee.Dictionary(VHregressionValues).get('scale');
  var VVscale = ee.Dictionary(VVregressionValues).get('scale');

  return img.setMulti({VVscale: VVscale, VHscale: VHscale
  });
  
};

// Apply the funtion to get the regression parameters as image properties
var ImgCollWithRegression = LIAImages.map(getRegressionParamaters);

/*if the user defined to get the mean reference LIA (9999), 
  get mean LIA for the selected point, 
  else skip and use the defined angle */
var getLIAmax = ImgCollWithRegression.limit(ImgCollWithRegression.size()).select('LIA').max().reduceRegions({
  collection: ROI,
  reducer: ee.Reducer.mean(),
  scale: 10,
});
  var getLIAmin = ImgCollWithRegression.limit(ImgCollWithRegression.size()).select('LIA').min().reduceRegions({
  collection: ROI,
  reducer: ee.Reducer.mean(),
  scale: 10,
});  
  
if (referenceAngle == 9999) {
  var meanLIA = (getLIAmax.first().getNumber('mean').add(getLIAmin.first().getNumber('mean'))).divide(2);
  referenceAngle = meanLIA;
}


// Add corrected values to the Sentinel-1 ImageCollection
var addCorrectedValues = function (img) {
  
  var VV = img.select('VV'),
      VH = img.select('VH'),
      VHscale = ee.Image(ee.Number(img.get('VHscale'))),
      VVscale = ee.Image(ee.Number(img.get('VVscale'))),
      angleDiff = (img.select('LIA').subtract(referenceAngle)),
      radarAngle = img.select('angle'),
      LIA = img.select('LIA');

  var corrected_VV = VV.subtract((VVscale).multiply(angleDiff))
              .rename('corrected_VV');

  var corrected_VH = VH.subtract((VHscale).multiply(angleDiff))
              .rename('corrected_VH');

  return img.addBands([corrected_VH, corrected_VV]);
};

// Add corrected bands to the Image Collection
var correctedValues = ImgCollWithRegression.map(addCorrectedValues);

return correctedValues;
  
};

// export the function
exports.LIACorrection = LIACorrection;
