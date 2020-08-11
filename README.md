# LIA Correction for Google Earth Engine (part of my Diploma Thesis)

This code repository is an attachment for my Diploma Thesis "A correction of the local incidence angle of SAR data: a land-cover specific approach for time series analysis".
The repository contains a folder "javascript_codes" where you can find: 
  - A Google Earth Engine (GEE) function "LIA_Correction_Function_for_GEE.js" to create a SAR image collection where bands have been corrected for effects of terrain
  - A GEE example usage of the function "LIA_Correction_Example.js"
  - Folder containing codes of (mainly) statistical analysis which were used for evaluating the effectivity and the accuracy of the proposed method

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
  - startDate (type Date)
  - endDate (type Date)
  - landCoverType (type Integer) // 312 for coniferous forest and 311 for broadleaf forest
  - boudningBoxSize (type Integer, optional, default: 10000)
  - referenceAngle (type Integer, optional, deafault: 9999 = mean angle from found LIAs)
  - SARCollection (type ImageCollection, optional, default: Sentinel-1 Image Collection with VV and VH bands)
  - acquistionMode (type String, optional, default: 'IW' as Interferometric Wide Swath)
  
