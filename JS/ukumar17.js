const margins = { top: 20, bottom: 60 , left: 60, right: 30 }
const height = 1000 - margins.top - margins.bottom
const width = 1600 - margins.left - margins.right

let circleColor = d3.scaleOrdinal(d3.schemeTableau10);
let parks;
let species;
let flags;


document.addEventListener('DOMContentLoaded', function () {

    Promise.all([d3.csv('Data/parks.csv'),d3.csv('Data/species.csv'),d3.csv('Data/flags.csv')])
    .then(function (values) {
        parks = values[0];
        species = values[1];
        
        flags = {}
        values[2].forEach(function(d){
            flags[d['id']]=d['url']
        })

        treemap(values[0], values[1], flags)
    });


   
});

d3.select("#acers").on("change", swtch);

function swtch(){
    treemap(parks, species, flags)
}

var tooltip = d3.select("#tooltip")
                .attr("class", "tooltip")
                .style("opacity", 0)
                .style("z", 999);


function treemap(parks, species, flags) {

    // Clear the existing svg
    d3.select("#treemap_svg").selectAll("*").remove()
      
    var speciesData = speciesDataFormat(species)

    const acers = document.getElementById("acers");

    // Create data for treemap
    var parksData = {
      name: 'parks',
      children: formatData(parks)
    };

    categories = []

    species.forEach(function(d){
        if (!categories.includes(d['Category'])){
            categories.push(d['Category'])
        }
    })


    console.log(categories)
  
    let treemapColor = d3.scaleOrdinal(d3.schemePastel1);
  
    var svg = d3.select("#treemap_svg")
                .attr("width", width)
                .attr("height", height);
  
    var root = d3.hierarchy(parksData)
                 .sum(function(d) { 
                    return d.value; })
                 .sort(function(a, b) 
                 { return b.value[1] - a.value[1]; });
  
    var treemap = d3.treemap()
                    .size([width, height])
                    .paddingTop(20)
                    .paddingRight(6)
                    .paddingInner(0)
                    (root);

    var rect = svg.selectAll("rect")
        .data(root.leaves())
        .enter().append("rect")
        .attr("x", function(d) { return d.x0; })
        .attr("y", function(d) { return d.y0; })
        .attr('background-image', "url('http://upload.wikimedia.org/wikipedia/commons/5/5c/Flag_of_Alabama.svg')")
        .attr("width", function(d) { return d.x1 - d.x0; })
        .attr("height", function(d) { return d.y1 - d.y0; })
        .attr("fill", function(d) { return treemapColor(d.data.state); })
        .attr('fill-opacity', 0.8)
        .attr("stroke", "black") // 1px black stroke
        .attr("stroke-width", 1) // 1px stroke width
        .on("mouseover", function(event, d) {
            tooltip.transition()
                .duration(10)
                .style("opacity", .9);
            tooltip.html( "Park Name : " + d.data.name + "<br>State : " + d.data.state + "<br>Area : " + d.data.acres + ' acres')
                .style("left", (event.clientX) + "px")
                .style("top", (event.clientY - 28) + "px");

        })
        .on("mousemove", function(d) {
            tooltip.style("left", (d.clientX + 10) + "px")
                .style("top", (d.clientY ) + "px");
        })
        .on("mouseout", function(event, d) {
            tooltip.transition()
                .duration(500)
                .style("opacity", 0);
            
        })
        ;
    
    svg
        .selectAll("text")
        .data(root.leaves())
        .enter()
        .append("text")
          .attr("x", function(d){ 
            return d.x0+5})   
          .attr("y", function(d){ return d.y0+15})    
          .text(function(d){ return ((d.data.name).split("National"))[0]})
          .attr("font-size", "8px")
          .attr("fill", "black");

    

    svg
        .selectAll("titles")
        .data(root.descendants().filter(function(d){return d.depth==1}))
        .enter()
        .append("text")
          .attr("x", function(d){ return d.x0})
          .attr("y", function(d){ return d.y0 + 18})
          .text(function(d){ return d.data.name })
          .attr("font-size", "18px")
          .attr("font-weight", 700)
          .attr("fill", function(d) { return treemapColor(d.data.name);} )
          .attr("stroke", "black") // 1px black stroke
          .attr("stroke-width", 1) // 1px stroke width


    rect.each(function(d) {
        var rect = d3.select(this);

        // svg.append("image")
        // .attr("x", rect.attr("x"))
        // .attr("y", rect.attr("y"))
        // .attr("xlink:href", flags[d.data.state])
        // .attr('opacity', 0.35)
        // .attr('object-fit','contain')
        // .attr("width", rect.attr("width"))
        // .attr("height", rect.attr("height"))
        
        // Append an SVG on top of the rectangle
        var svgOverlay = svg.append("svg")
            .attr("x", rect.attr("x"))
            .attr("y", rect.attr("y"))
            .attr("width", rect.attr("width"))
            .attr("height", rect.attr("height"))
            .attr("id", 'svg_'+ d.data.code)

            circularPacking(d.data.code, speciesData[d.data.code])
        
        });


    const colorLegend = d3.select("#legend_svg")
        .attr("width", 120)
        .attr("height", height)
        .append("g");

    const legend = colorLegend.selectAll(".legend")
        .data(categories)
        .enter().append("g")
        .attr("class", "legend")
        .attr("transform", (d, i) => "translate(-10," + (height - 20 * (i + 1)) + ")");

    legend.append("rect")
        .attr("x", 10)
        .attr("width", 10)
        .attr("height", 10)
        .style("fill", d=> circleColor(d));

    legend.append("text")
        .attr("x", 25)
        .attr("y", 5)
        .attr("dy", ".30em")
        .attr("font-size", "12px")
        .style("text-anchor", "begin")
        .text(d => d);

    // Helper function to format data for treemap
    function formatData(obj) {
      var result = [];
      states = {};
      index = 0;
      obj.forEach(function(d) {
        value = speciesData[d['Park Code']].reduce((acc, curr)=>acc+curr.value,0)

        if (!Object.keys(states).includes(d['State'])){
            states[d['State']] = index;
            index+=1;
            result.push({name:d['State'], children:[]})
        }
        
        result[states[d['State']]].children.push({ code: d['Park Code'], name:d['Park Name'], value: (!acers.checked)? value : d['Acres'], state: d['State'], acres: d['Acres']});
      })
      return result;
    }

    function speciesDataFormat(obj){
      var result = {};
      
      obj.forEach(function(d) {
        var parkCode = (d['Species ID'].split("-"))[0];
        var category = d['Category'];

        if (!result[parkCode]) {
          result[parkCode] = {};
        }

        if (!result[parkCode][category]) {
            result[parkCode][category] = 1;
        } else {
          result[parkCode][category] += 1;
        }
      });
      
      result1 = {}

      for (keys in result){
        temp = []
        for (keys2 in result[keys]){
            temp.push({name:keys2, value:result[keys][keys2]})
        }
        result1[keys] = temp;
      }
      return result1;
    }

}



function circularPacking(key,data){

    
    // append the svg object to the body of the page
    var svg = d3.select("#svg_"+key)
    
    // set the dimensions and margins of the graph
    var width = svg.attr('width')
    var height = svg.attr('height')

    var size = d3.scaleLinear()
    .domain([0, 1000])
    .range([5,30])



    var node = svg.append("g")
    .selectAll("circle")
    .data(data)
    .enter()
    .append("circle")
        .attr("r", function(d){ return size(d.value)})
        .attr("cx", width / 2)
        .attr("cy", height / 2)
        .style("fill", function(d){ return circleColor(d.name)})
        .style("fill-opacity", 1)
        .attr("stroke", "#000")
        .style("stroke-width", 1)
        .on("mouseover", function(event, d) {
            tooltip.transition()
                .duration(10)
                .style("opacity", .9);
            tooltip.html( "Category : " + d.name + "<br>Count : " + d.value)
                .style("left", (event.clientX) + "px")
                .style("top", (event.clientY - 28) + "px");

        })
        .on("mousemove", function(d) {
            tooltip.style("left", (d.clientX + 10) + "px")
                .style("top", (d.clientY ) + "px");
        })
        .on("mouseout", function(event, d) {
            tooltip.transition()
                .duration(500)
                .style("opacity", 0);
            
        })
        .call(d3.drag()
           .on("start", dragstarted)
           .on("drag", dragged)
           .on("end", dragended));

    // Features of the forces applied to the nodes:
    var simulation = d3.forceSimulation()
      .force("boundary", forceBoundary(width*0.15, height*0.30, width*0.7, height*0.7))
      .force("center", d3.forceCenter().x(width*0.5).y(height*0.5)) // Attraction to the center of the svg area
      .force("charge", d3.forceManyBody().strength(.5)) // Nodes are attracted one each other of value is > 0
      .force("collide", d3.forceCollide().strength(.2).radius(function(d){ return (size(d.value)+3) }).iterations(1)) // Force that avoids circle overlapping

    // Apply these forces to the nodes and update their positions.
    // Once the force algorithm is happy with positions ('alpha' value is low enough), simulations will stop.
    simulation
        .nodes(data)
        .on("tick", function(d){
        node
            .attr("cx", function(d){ return d.x; })
            .attr("cy", function(d){ return d.y; })
        });

    function dragstarted(d, e) {
        if (!d.active) simulation.alphaTarget(.03).restart();
        e.x = d.x;
        e.y = d.y;
        }
    function dragged(d, e) {
        e.x = d.x;
        e.y = d.y;
        }
    function dragended(d, e) {
        if (!d.active) simulation.alphaTarget(.03);
        e.x = d.x;
        e.y = d.y;
        }

}