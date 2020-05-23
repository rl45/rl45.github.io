

var svg = d3.select("svg"),
    width = +svg.attr("width"),
    height = +svg.attr("height");

/*
Projection is a method by which 3D space 'projects' onto 2D plane
 .Scale(3000) is not changing the map size
 d3.geoAlbersUsa is specific to USA
 d3.geo.mercator is the world map
 */
var projection = d3.geoMercator()
    .center([26, -28]) //Centers the map. Without it, it will not center the SVG to South Africa
    .scale(2000)
    .translate([width / 2, height / 2]); //Sets to middle of SVG
//.translate([width/4, height/2]); //Sets to left

/*Issue with map not showing when adding .projection(projection)
        Perhaps its moving the map outside of the SVG??
        Only works when remove .projection, but map is small. The issue was that I wasn't centering the projection so it could have been looking at the ocean
*/
var path = d3.geoPath()
    .projection(projection);

//Color domain ranges from 1 to 350 representing one hundred thousand people
var color = d3.scaleThreshold()
    .domain([1, 10, 50, 100, 150, 200, 250, 300, 350])
    .range(d3.schemeOrRd[9]);

//Range for X. In our case, 1 to 350 thousand people density
var x = d3.scaleSqrt()
    .domain([0, 350])
    .rangeRound([440, 950]);

var g = svg.append("g")
    .attr("class", "key")
    .attr("transform", "translate(0,40)");

g.selectAll("rect")
    .data(color.range().map(function (d) {
        d = color.invertExtent(d);
        console.log(d)
        if (d[0] == null) d[0] = x.domain()[0];
        if (d[1] == null) d[1] = x.domain()[1];
        return d;
    }))
    .enter().append("rect")
    .attr("height", 8)
    .attr("x", function (d) { return x(d[0]); })
    .attr("width", function (d) { return x(d[1]) - x(d[0]); })
    //.attr("fill", function (d) { return color(d[0]); });
    .attr("fill", function (d) { 
        console.log(d[0])
        return rgb(190, 100, (d[0]));  
    });

g.append("text")
    .attr("class", "caption")
    .attr("x", x.range()[0])
    .attr("y", -6)
    .attr("fill", "#000")
    .attr("text-anchor", "start")
    .attr("font-weight", "bold")
    .text("Population Density per one hundred thousand people");

g.call(d3.axisBottom(x)
    .tickSize(13)
    .tickValues(color.domain()))
    .select(".domain")
    .remove();


d3.json("SouthAfrica.json").then(function (topology) {

    /*
    
    Goal: To calculate the area for each region, then divide population by the total area to receive the density
          We will be working with region 1 which consts of 9 different regions
    
    */

    /*
    var areas1 = topology.objects.gadm36_ZAF_1.geometries //9
    console.log(areas1)    

    var areas2 = topology.objects.gadm36_ZAF_2.geometries //52
    console.log(areas2)

    var areas3 = topology.objects.gadm36_ZAF_3.geometries //234
    console.log(areas3)
    */


    var totalAverageUrbanPopulation_2015_2018 = 0.0
    var totalAverageRuralPopulation_2015_2018 = 0.0

    d3.csv("SouthAfricaPop.csv").then(function (population) {
        for (var i = 2015; i <= 2018; i++) {
            totalAverageUrbanPopulation_2015_2018 += parseInt(population[0][i]) //Needs to parseInt because JS reads the population as a string
            totalAverageRuralPopulation_2015_2018 += parseInt(population[1][i])
        }
        totalAverageUrbanPopulation_2015_2018 = totalAverageUrbanPopulation_2015_2018 / 4 //Divides by the amount of years. 2015, 2016, 2017, 2018
        totalAverageRuralPopulation_2015_2018 = totalAverageRuralPopulation_2015_2018 / 4

        console.log("Total Average Urban Population " + totalAverageUrbanPopulation_2015_2018)

        d3.csv("SouthAfricaPercentageArea.csv").then(function (SA_Area_Percentage) {
            console.log(SA_Area_Percentage)

            var areaDict = []
            /*

            Loop through CSV file and add to dictionary for easier access when creating the colors
            Encountering error where the dicitonary adds it as ["Region"] & sometimes "Region"
            Tried doing console.log( typeof region) but shows up as all strings. Even rewrote the CSV files, but same issue

            */
            for (var i = 0; i < SA_Area_Percentage.length; i++) {
                var region = (SA_Area_Percentage[i]["Region"]).toString()
                areaDict[region] = (SA_Area_Percentage[i]['Percentage'])
            }

            //console.log(areaDict)
            //console.log(areaDict["Northern Cape"])
            //console.log(areaDict["Limpopo"])

            svg.append("g")
                .selectAll("path")
                .data(topojson.feature(topology, topology.objects.gadm36_ZAF_0).features)
                .enter().append("path")
                .attr("fill", function (d) { return "#d7ddf2"; })
                .attr("d", path);
            svg.append("g")
                .selectAll("path")
                .data(topojson.feature(topology, topology.objects.gadm36_ZAF_1).features)
                .enter().append("path")
                .attr("fill", function (d) {

                    var region = (d.properties.NAME_1).toString()   //Region of layer1 of South Africa's map
                    var areaPercentage = areaDict[region] / 100       //Turn into percentage. 30 -> 0.3
                    var density = areaPercentage * totalAverageUrbanPopulation_2015_2018
                    console.log("Density " + density)
                    var densityRGB = 350 - density / 25555            //The numbers are too large. I need to divide them into a number less than 255. Anything larger results in just black. 255 subtracting densityRGB flips the colors so that a higher density results in a darker color
                    console.log("Density RGB: "  + densityRGB)

                    /*
                    
                    console.log(areaDict[region]) //Confirmed, found in dictinary created earlier
                    Returning an error code of undefined for KwaZula-Natal" -> Mispelled KwaZula should be KwaZulu
                    Ex: return color(d.properties.density);
                    New error: Color is just returning black. Tried creating a hex with .toString(16), but just returns black. return "#"+(50).toString(16)+(50).toString(16)+(densityRGB).toString(16); //.toString(16) Turns an Int into a hexadecimal string 
                    Color works after creating an RGB function. Now I need to reverse it, as regions that have a higher density should result in a darker color
                    
                    */
                    console.log(divide())
                    return (rgb(190, 100, densityRGB))
                })//End of attr fill 
                .attr("d", path);

            svg.append("path")
                .datum(topojson.feature(topology, topology.objects.gadm36_ZAF_0.geometries))
                .attr("fill", "none")
                .attr("stroke", "#000")
                .attr("stroke-opacity", 0.3)
                .attr("d", path);
            svg.append("path")
                .datum(topojson.feature(topology, topology.objects.gadm36_ZAF_1.geometries))
                .attr("fill", "none")
                .attr("stroke", "#000")
                .attr("stroke-opacity", 0.9)
                .attr("d", path);
            /*svg.append("path")
                .datum(topojson.feature(topology, topology.objects.gadm36_ZAF_2.geometries))
                .attr("fill", "none")
                .attr("stroke", "#000")
                .attr("stroke-opacity", 0.3)
                .attr("d", path);*/

        })//Area CSV closing
    })//Populatioon CSV closing
})
    .catch(function (error) {
        console.log(error)
    })


    function rgb(r, g, b){
        return "rgb("+r+","+g+","+b+")";
    }
  
        //Calculating it for the color range
        function divide(){    
        var n = [    
            5123400.7305000005/100000,
            3935365.7785/ 100000,
            556891.38375/100000 ,
            2858709.10325 / 100000,
            3786861.4094999996/100000,
            2338943.81175/ 100000,
            3192843.9335 / 100000,
            11323458.13625/100000,
            3935365.7785/100000
        ]
        return n
    }