var srtm = ee.Image("USGS/SRTMGL1_003");

var coordinates = ee.List([
    [20.00875081483153, 48.956919483117055], // case study 1
    [13.50260067598048, 49.03471783655703], // case study 4
    [22.487356732697656, 49.06437640865721], // case study 6
    [14.967128030906887, 48.92172630604342], // case study 12
]);

// Calculate slope and aspect from DEM, in radians for further calculations
var slope = ee.Terrain.slope(srtm);
var aspect = ee.Terrain.aspect(srtm);

// Function to compute mean elevation from DEM for study areas
var computeElevation = function(order) {
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
var computeSlope = function(order) {
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

// Function to compute mean slope from DEM for study areas
var computeAspect = function(order) {
    var point = ee.Geometry.Point(order);

    // Create 20x20 km bounding box around the selected point 
    var bufferForRndData = (point.buffer(10000)).bounds();

    var getElevation = aspect.reduceRegions({
        collection: bufferForRndData,
        reducer: ee.Reducer.mean(),
        scale: 30,
    });

    return getElevation.first().get('mean');
};

var DEMElevation = coordinates.map(computeElevation)
var DEMSlope = coordinates.map(computeSlope)
var DEMAspect = coordinates.map(computeAspect)

print(DEMElevation, 'Mean elevation for the areas')
print(DEMSlope, 'Mean slope for the areas')
print(DEMAspect, 'Mean aspect for the areas')
