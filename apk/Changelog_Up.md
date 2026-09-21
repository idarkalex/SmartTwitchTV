September 21 2026
==============

* Player menu performance: GPU/rendering fixes for low-end devices (Xiaomi TV 4S)
* Replaced filter:drop-shadow with text-shadow (was forcing expensive rasterization)
* Replaced player gradient with solid color (was causing GPU compositing stalls)
* Removed 35+ unnecessary compositor layers from control buttons
* Fixed ad-filter URL malformed (http// -> http://)
* Fixed async token request crash (was using anonymous headers causing 401)

