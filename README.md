# Local incidence angle correction LC-SLIAC for forests in Google Earth Engine  

This code repository is an attachment for the article (currently in review) in Remote Sensing: Paluba et al. (2021): "Land cover-specific local incidence angle correction: an approach for time series analysis of forest ecosystems".
The repository contains a folder "javascript_codes" where you can find: 
  - A JavaScript Google Earth Engine (GEE) function "LC-SLIAC.js" to create a SAR image collection where bands have been corrected for effects of terrain
  - A JavaScript GEE example usage of the function "LC-SLIAC_Example.js" where three-month time series chart and the image collection are added to the GEE Console

## About the Land cover-specific local incidence angle correction (LC-SLIAC) in GEE
The land cover-specific local incidence angle correction (LC-SLIAC) is based on the linear relationship between the backscatter values and the local incidence angle (LIA) for a given land cover type in the monitored area. Using the combination of CORINE Land Cover and Hansen Global Forest databases, a wide range of different LIAs for a specific forest type can be generated for each individual scene. The algorithm was developed and tested in the cloud-based platform Google Earth Engine (GEE) using Sentinel-1 open access data, Shuttle Radar Topography Mission (SRTM) digital elevation model, as well as CORINE Land Cover and Hansen Global Forest databases. The developed method was created primarily for time-series analysis of forests in mountainous areas. LC-SLIAC was tested in 16 study areas over several protected areas in Central Europe. 

<b>Methodology:</b> The most important step in the methodology of the LC-SLIAC method was to calculate the LIA for every image pixel, where other parameters from the SRTM DEM (slope and aspect) and SAR image (viewing azimuth) needed to be calculated. For SAR images, the active shadow and layover areas were masked out, followed by the generation of forest mask, which was used to select an appropriate number of forest areas to explain the relationship between LIA and backscatter in the linear regression analysis.


Figure 1. Methodology workflow used in this work




### LIACorrection function and its usage in GEE
You can use this function after the reqirement call require('users/danielp/LC-SLIAC:LC-SLIAC'), i.e.:
```ruby
require('users/danielp/LC-SLIAC:LC-SLIAC') 
```
or by copying the code in the "LC-SLIA.js" to your code editor and call it with defined parameters.

#### Parameters of the function:
  - ROI (type Geometry)
      - Define the ROI for what you want to create a time series analysis
  - startDate (type Date)
      - Start date of the time series
  - endDate (type Date)
      - End date of the time series
  - landCoverType (type Integer)
      - Define the land cover type. Currently supported for coniferous forest (312) and broadleaf forest (311).
  - boudningBoxSize (type Integer, *optional, default: 10000*)
      - The bounding box size around the selected area to calculate the backscatter-LIA dependence. This area is used to clip the resulted image collection after the correction.
  - referenceAngle (type Integer, *optional, deafault: 9999* = mean angle from found LIAs)
      - Reference angle to which the backscatter values will be corrected. For time series analyses, it is recommended to use the default value - the mean value from the minimum and maximum value of observed LIA (from the available paths).
  - SARCollection (type ImageCollection, *optional, default: Sentinel-1 Image Collection with VV and VH bands*)
      - Select the SAR image collection for which you want to apply the LIA correction. Tested for Sentinel-1 data
  - acquistionMode (type String, optional, *default: 'IW'*)
      - Acqusition mode for Sentinel-1 data in GEE can be 'IW' (Interferometric Wide Swath), 'EW' (Extra Wide Swath) or 'SM' (Strip Map)

#### Output of the function:
The main output of the LC-SLIAC function is the input Sentinel-1 image collection clipped to the predefined study area size by boudningBoxSize, extended by:
 - Image bands:
      - LIA - the calculated local incidence angle image
      - corrected_VH - VH band after LC-SLIAC where active shadow and layover areas are masked out
      - corrected_VV - VV band after LC-SLIAC where active shadow and layover areas are masked out
  
 - Statistical parameters in the properties:
      - VVscale, VH scale - the scale coefficient calculated from the regression analysis for VV and VH polarization, respectively
      - VVoffset, VHoffset - the offset coefficient calculated from the regression analysis for VV and VH polarization, respectively
      - VVnumberOfForestPoints, VHnumberOfForestPoints - the number of forest areas included in the regression analysis for VV and VH polarization, respectively
      - VHR2, VVR2 - the resulted coefficient of determination (R<sup>2</sup>) of the regression analysis 
      - VHpValue, VVpValue - the p-value for the regression analysis
      - MeanElevationOfForestPoints - mean elevation of selected forest areas
      - VV_LIAIQR, VH_LIAIQR - LIA interquartile range (IQR) for forest areas
      - LIA_range_VV, LIA_range_VH - LIA range for forest areas


#### Important note:
For long-term time series analysis, e.g. for the whole Sentinel-1 archive, it is recommended to zoom in to the selected study area, as it is done in the example script (LC-SLIAC_Example.js). 
