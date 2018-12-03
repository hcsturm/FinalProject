var dateSelection;
var popupTemplate;
var percentage;

require([
	 "esri/views/2d/draw/Draw",
	 "esri/Map",
    "esri/views/MapView",
  	"esri/Graphic",
  	"esri/geometry/Polygon",
  	"esri/geometry/geometryEngine",
  	"esri/widgets/Search",
    "esri/layers/FeatureLayer",
    "esri/layers/GraphicsLayer",
	"esri/tasks/QueryTask",
	"esri/tasks/support/Query",
	"dojo/_base/array",
	"dojo/dom",
	"dojo/on",
	"dojo/domReady!",
	"esri/geometry/SpatialReference",
  	"esri/geometry/projection"
 ],

function(
	Draw, Map, MapView, Graphic, Polygon, geometryEngine, Search, FeatureLayer, GraphicsLayer,
	QueryTask, Query, arrayUtils, dom, on, SpatialReference, projection) {

    //Lake Level and Lake Name Feature Layer
	var featureLayer = new FeatureLayer({
		url: "https://services9.arcgis.com/Ma7hMGk0KKCHeeUZ/arcgis/rest/services/TopLakeDataPoints/FeatureServer/0"
    });

    //creating a map layer to display the feature layer
	var map = new Map({
	  basemap: "topo",
	  layers: [featureLayer]
	});

    //the view container that the map will be displayed in on the HTML
    var view = new MapView({
      container: "viewDiv",
      map: map,
      zoom: 6,
      center: [-98.426085, 30.803870]
    });

	//adding the polygon drawing tool to the bottom-left of the web map
	view.ui.add("draw-polygon", "bottom-left");

    //creating the draw variable
	var draw = new Draw({
    	view: view
  	});
    //search widget
	var search = new Search ({
		view: view
	});
	//adding the search widget to the top left of the web map
	view.ui.add(search, "top-left");

	//Search for a particular named lake in the feature layer
	search.sources.push({
		featureLayer: featureLayer,
		searchFields: ["RES_NAME"],
		displayField: "RES_NAME",
		exactMatch: false,
		outFields: ["RES_NAME"],
		resultGraphicEnabled: true,
		name: "Reservior",
		placeholder: "Texas Reserviors"
	});

      // draw polygon button
	document.getElementById("draw-polygon").addEventListener("click",

	function() {
		view.graphics.removeAll();
		// create() will return a reference to an instance of PolygonDrawAction
		var action = draw.create("polygon");
		// focus the view to activate keyboard shortcuts for drawing polygons
		view.focus();
		// listen polygonDrawAction events to give immediate visual feedback
		// to users as the polygon is being drawn on the view.
		action.on("vertex-add", drawPolygon);
		action.on("cursor-update", drawPolygon);
		action.on("vertex-remove", drawPolygon);
		action.on("redo", drawPolygon);
		action.on("undo", drawPolygon);
		action.on("draw-complete", drawPolygon);
	});

	// this function is called from the polygon draw action events
	// to provide a visual feedback to users as they are drawing a polygon
	function drawPolygon(event) {
		var vertices = event.vertices;
		//remove existing graphic
		view.graphics.removeAll();
        // create a new polygon
        var polygon = new Polygon({
          rings: vertices,
          spatialReference: view.spatialReference
        });
        // create a new graphic representing the polygon, add it to the view
		var graphic = new Graphic({
          geometry: polygon,
          symbol: {
            type: "simple-fill", // autocasts as SimpleFillSymbol
            color: [178, 102, 234, 0.8],
            style: "solid",
            outline: { // autocasts as SimpleLineSymbol
              color: [255, 255, 255],
              width: 2
            }
          }
        });
        view.graphics.add(graphic);
        // calculate the area of the polygon
        var area = geometryEngine.geodesicArea(polygon, "acres");
        if (area < 0) {
          // simplify the polygon if needed and calculate the area again
          var simplifiedPolygon = geometryEngine.simplify(polygon);
          if (simplifiedPolygon) {
            area = geometryEngine.geodesicArea(simplifiedPolygon, "acres");
          }
        }
        // start displaying the area of the polygon
        labelAreas(polygon, area);
      }
      //Label polyon with its area
      function labelAreas(geom, area) {
        var graphic = new Graphic({
          geometry: geom.centroid,
          symbol: {
            type: "text",
            color: "black",
            haloColor: "black",
            haloSize: "1px",
            text: area.toFixed(2) + " acres",
            xoffset: 3,
            yoffset: 3,
            font: { // autocast as Font
              size: 14,
              family: "sans-serif"
            }
          }
        });
        view.graphics.add(graphic);
      }
       var popUrl=
			"https://services9.arcgis.com/Ma7hMGk0KKCHeeUZ/arcgis/rest/services/TopLakeDataPoints/FeatureServer/0";

        featureLayer.when(function() {
          view.goTo(featureLayer.fullExtent);
        });
        var resultsLayer = new GraphicsLayer();

			var qTask = new QueryTask({
				url: popUrl,
			});

			var params = new Query({
				returnGeometry: true,
				outFields: ["*"],
				outSpatialReference:
				{
          			"wkid": 102100
          		}

			});

			//The varibale determines the position of the base map gallery.
			view.when(function() {
				view.ui.add("optionsDiv", "bottom-right");
				on(dom.byId("doBtn"), "click", doQuery);
			});

			var attributeName = dom.byId("attSelect");
			var expressionSign = dom.byId("signSelect");
			var value = dom.byId("valSelect");

			function doQuery() {
				dateSelection = document.getElementById("attSelect").value;
				popupTemplate = {
					title: "{RES_NAME}",
					fieldInfos: [{
					fieldName: "{RES_NAME_1}",
					label: "{STATUS}",
					format: {
						places: 0,
						digitSeperator: true
					}
				}],
					content:
					"<b>Lake Name:" + "</b> {RES_NAME} " +
					"<br> <b>Lake Volume Capacity:" + "</b> {level_la_1} " + "<br>" +
					/* "<br> <b>Lake Percent full:" + "</b> {F10_6_2009}/{level_la_1} =  " + */
					"<strong>" + dateSelection + ": </strong>" +
					"{" + dateSelection + "}" + "<br>"
				};


				resultsLayer.removeAll();
				params.where = attributeName.value + expressionSign.value + value.value;
				qTask.execute(params)
				.then(getResults)
				.catch(promiseRejected);
			}

			function getResults(response) {

				var popResults = arrayUtils.map(response.features, function(
				feature) {
					feature.popupTemplate = popupTemplate;
					return feature;
				});
				resultsLayer.addMany(popResults);
				view.goTo(popResults).then(function() {
					view.popup.open({
						features: popResults,
            			featureMenuOpen: true,
            			updateLocationEnabled: true
					});
				});
				dom.byId("printResults").innerHTML = popResults.length +
				 " results found for " + document.getElementById("attSelect").value + "!";
				}

				function promiseRejected(error) {
					console.error("Promise rejected: ", error.message);

			}


      });
      
