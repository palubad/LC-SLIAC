var srtm = ee.Image("USGS/SRTMGL1_003");

var coordinates = ee.List([
[20.00875081483153,48.956919483117055],
[13.47758, 49.04568],
[19.66245, 48.95963],
[13.50260067598048,49.03471783655703],
[21.461766627966856,48.42000354437079],
[22.487356732697656,49.06437640865721],
[17.24905617079275,48.39159760651447],
[21.979868687373816,47.63471193862206],
[18.968277047486474,47.72150561736114],
[13.827222655625512,49.728411261182785],
[16.019562475334375,49.67864905763304],
[14.967128030906887,48.92172630604342],
[18.5185869, 49.4804783],
[20.54097173640553,51.143568042558734],
[16.09451291987721,52.816269863881196]
]);

// Calculate slope from DEM, in radians for further calculations
var slope = ee.Terrain.slope(srtm);

// Function to compute mean elevation from DEM for study areas
var computeElevation = function (order) {
  var point = ee.Geometry.Point(order);

  // Create 20x20 km bounding box around the selected point 
  var bufferForRndData = (point.buffer(10000)).bounds();
  
  var getElevation = srtm.reduceRegions({
  collection: bufferForRndData,
  reducer: ee.Reducer.mean(),
  scale: 30,
  });

  return getElevation.first().get('mean');
};

// Function to compute mean slope from DEM for study areas
var computeSlope = function (order) {
  var point = ee.Geometry.Point(order);

  // Create 20x20 km bounding box around the selected point 
  var bufferForRndData = (point.buffer(10000)).bounds();
  
  var getElevation = slope.reduceRegions({
  collection: bufferForRndData,
  reducer: ee.Reducer.mean(),
  scale: 30,
  });

  return getElevation.first().get('mean');
};


var DEMElevation = coordinates.map(computeElevation)
var DEMSlope = coordinates.map(computeSlope)

print(DEMElevation, 'Mean elevation for the areas')
print(DEMSlope, 'Mean slope for the areas')
