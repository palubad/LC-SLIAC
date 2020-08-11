# LIA Correction for forests in Google Earth Engine (part of my Diploma Thesis)

This code repository is an attachment for my Diploma Thesis "A correction of the local incidence angle of SAR data: a land-cover specific approach for time series analysis".
The repository contains a folder "javascript_codes" where you can find: 
  - A JavaScript Google Earth Engine (GEE) function "LIA_Correction_Function_for_GEE.js" to create a SAR image collection where bands have been corrected for effects of terrain
  - A JavaScript GEE example usage of the function "LIA_Correction_Example.js"
  - Folder containing JavaScript codes of (mainly) statistical analysis which were used for evaluating the effectivity and the accuracy of the proposed method

## About the GEE function LIACorrection
The LIACorrection method represents a correction of the local incidence angle (LIA) for time series analysis of forests. The methodology is based on the use of a linear regression relationship between backscatter and LIA, which is calculated for each image separately. Using the combination of CORINE and Hansen Global Forest databases, a wide range of different LIAs for a specific forest type can be generated for each individual image. The slope of the regression line and the mean of minimum and maximum LIA from all the different image paths are using to correct the terrain effects in the time series analysis. The algorithm is prepared in Google Earth Engine using Sentinel-1 open access data, SRTM digital elevation model, and CORINE and Hansen Global Forest databases. This methodology aims to be achievable for a wide remote sensing community using open access tools and data.
The method was tested in the time series analyses of the forest changes in the selected case studies. The corrected backscatter data gave significantly more accurate values than the original ones mainly in the areas with higher values of slope. An application of the method in the time series of the forest changes ensured more accurate detection of the changes in the mountainous areas.

### LIACorrection function and its usage in GEE
You can use this function after the reqirement call require('users/danielp/LIA_Correction:LIA_Correction_Function'), like:
```ruby
require('users/danielp/LIA_Correction:LIA_Correction_Function') 
```
or by copying the code in the "LIA_Correction_Function_for_GEE.js" to your code editor and call it with defined parameters.

#### Parameters of the function:
  - ROI (type Geometry)
      - Define the ROI for what you want to create a Time Series Analysis
  - startDate (type Date)
      - Start date of the Time Series
  - endDate (type Date)
      - End date of the Time Series
  - landCoverType (type Integer)
      - Define the land cover type. Currently supported for coniferous forest (312) and broadleaf forest (311).
  - boudningBoxSize (type Integer, *optional, default: 10000*)
      - The bounding box size around the selected area to calculate the backscatter-LIA dependence.
  - referenceAngle (type Integer, *optional, deafault: 9999* = mean angle from found LIAs)
      - Reference angle to which the backscatter values will be corrected. The default is the mean value from the minimum and maximum value of observed LIA (from the available paths).
  - SARCollection (type ImageCollection, *optional, default: Sentinel-1 Image Collection with VV and VH bands*)
      - Select the SAR image collection for which you want to apply the LIA correction. Tested for Sentinel-1 data
  - acquistionMode (type String, optional, *default: 'IW'*)
      - Acqusition mode for Sentinel-1 data in GEE can be 'IW' - Interferometric Wide Swath or 'EW' - Extra Wide Swath
