var x2js = new X2JS();   

var app = app || {};

app.file = null;
app.nodes = null;

app.config = {
	width: 960,
	height: 2200,
	diameter : 1000,
	noderadius : 5,
	layout: "radial"
}

app.layouts = {};

app.init = function () {

	var xhr = new XMLHttpRequest();
	// check for the neccessary APIs && is XHR2 available?
	if (window.File && window.FileList && window.FileReader && xhr.upload) {

		var filedrag = document.getElementById("canvas");
		// file drop
		filedrag.addEventListener("dragover", app.fileDragHover, false);
		filedrag.addEventListener("dragleave", app.fileDragHover, false);
		filedrag.addEventListener("drop", app.fileSelectHandler, false);
		filedrag.style.display = "block";
	} else {
		app.sorry();
	}

	app.bindConfigUI();
};

app.sorry = function () {
	alert("Sorry, Noder needs a state of the art browser.");
};

app.bindConfigUI = function() {
	document.getElementById("layout-vertical").style.display = "none";

	var l = document.getElementById("cfg-layout");
	l.onchange = function (e) {
		app.config.layout = this.value;
		console.log("New layout ", this.value);
		switch(this.value) {
			case "radial": 
				document.getElementById("layout-vertical").style.display = "none";
				document.getElementById("layout-radial").style.display = "";
				break;
			case "vertical": 
				document.getElementById("layout-vertical").style.display = "";
				document.getElementById("layout-radial").style.display = "none";
				break;
		}		
		app.renderData();
	};

	var configs = ["width", "height", "diameter", "noderadius"];
	configs.forEach(function (cfg) {
		var input = document.getElementById("cfg-" + cfg);
		input.value = app.config[cfg];
		input.onchange = function() {
			app.config[cfg] = this.value;
			console.log("New ", cfg, ": ", this.value);
			app.renderData();
		}
	});
}

// file drag hover
app.fileDragHover = function (e) {
	e.stopPropagation();
	e.preventDefault();
	e.target.className = (e.type == "dragover" ? "hover" : "");
};

// file selection
app.fileSelectHandler = function(e) {

	// cancel event and hover styling
	app.fileDragHover(e);

	// fetch FileList object
	var files = e.target.files || e.dataTransfer.files;

	// process all File objects
	for (var i = 0, f; f = files[i]; i++) {
		app.parseFile(f);
	}
};

app.parseFile = function(file) {

	if(file.name.substr(file.name.lastIndexOf('.')) === ".mm") {
		console.log("Detected Freenode .mm file");
		console.log(file);


		var reader = new FileReader();

		reader.onload = function(e) {
			console.log("File loaded", e);

			app.file = e.target.result;

			window.setTimeout(app.prepareData, 500);
		};

		reader.readAsText(file);

	} else {
		alert("Sorry, currently we're only accepting Freenode .mm files");
	}	
};

app.prepareData = function () {
	console.log("Preparing data");

	var json = x2js.xml_str2json( app.file );

	console.log(json);

	app.nodes = app.convertFreemindNodes(json);

	app.renderData();
};

app.renderData = function () {
	console.log("Rendering data");

	var old = document.getElementById("rendering");
	if(old) {
		removeElement(old);
	}

	var layout = app.config.layout;
	if(app.layouts[layout]) {
		app.layouts[layout]();
	}
	//app.renderRadialDendogramm();

	var svg = document.getElementById("canvas").innerHTML;
	var b64 = btoa(unescape(encodeURIComponent(svg)));

	var datalink = document.getElementById("download-svg");
	datalink.href = "data:image/svg+xml;base64,\n"+b64;
};

app.layouts.radial = function () {

	var diameter = app.config.diameter;
	var noderadius = app.config.noderadius;

	
	var tree = d3.layout.tree()
	    .size([360, diameter / 2 - 200])
	    .separation(function(a, b) { return (a.parent == b.parent ? 1 : 2) / a.depth; });
	
	var diagonal = d3.svg.diagonal.radial()
	    .projection(function(d) { return [d.y, d.x / 180 * Math.PI]; });
	
	var svg = d3.select("#canvas").append("svg")
				.attr("id", "rendering")
				.attr("version", "1.1")
				.attr("xmlns", "http://www.w3.org/2000/svg")
				.attr("version", "1.1")
				//.attr("xmlns:xlink", "http://www.w3.org/1999/xlink")
	    		.attr("width", diameter)
			    .attr("height", diameter - 150)
			  .append("g")
			    .attr("transform", "translate(" + diameter / 2 + "," + diameter / 2 + ")");


	
	var nodes = tree.nodes(app.nodes),
	    links = tree.links(nodes);

	var link = svg.selectAll(".link")
			    	.data(links)
	  			.enter().append("path")
				    .attr("class", "link")
				    .attr("d", diagonal)
				    .attr("fill", "none")
				    .attr("stroke", "#ccc")
				    .attr("stroke-width", "1.5px");

	var node = svg.selectAll(".node")
				    .data(nodes)
				.enter().append("g")
	    			.attr("class", "node")
	    			.attr("transform", function(d) { return "rotate(" + (d.x - 90) + ")translate(" + d.y + ")"; })
				node.append("circle")
				    .attr("r", noderadius)
				    .attr("fill", "#fff")
				    .attr("stroke", "steelblue")
				    .attr("stroke-width", "1.5px");
				node.append("text")
				    .attr("dy", ".31em")
	    			.attr("text-anchor", function(d) { return d.x < 180 ? "start" : "end"; })
	    			.attr("transform", function(d) { return d.x < 180 ? "translate(8)" : "rotate(180)translate(-8)"; })	    			
			    	.attr("font-family", "Helvetica")
			    	.attr("font-size", "10px")
	    			.text(function(d) { return d.name; });		
	
	d3.select(self.frameElement).style("height", diameter - 150 + "px");	
}

app.layouts.vertical = function () {

	var width = app.config.width,
	    height = app.config.height;

	var noderadius = app.config.noderadius;	    
	
	var cluster = d3.layout.cluster()
	    .size([height, width - 160]);
	
	var diagonal = d3.svg.diagonal()
	    .projection(function(d) { return [d.y, d.x]; });
	
	var svg = d3.select("#canvas").append("svg")
				.attr("id", "rendering")
				.attr("version", "1.1")
				.attr("xmlns", "http://www.w3.org/2000/svg")
				//.attr("xmlns:xlink", "http://www.w3.org/1999/xlink")
				.attr("version", "1.1")
			    .attr("width", width)
			    .attr("height", height)
			  .append("g")
			    .attr("transform", "translate(40,0)");
	
	
	var nodes = cluster.nodes(app.nodes),
	    links = cluster.links(nodes);
	
	var link = svg.selectAll(".link")
	    .data(links)
	  .enter().append("path")
	    .attr("class", "link")
		.attr("fill", "none")
		.attr("stroke", "#ccc")
		.attr("stroke-width", "1.5px")	    
	    .attr("d", diagonal);
	
	var node = svg.selectAll(".node")
	    .data(nodes)
	  .enter().append("g")
	    .attr("class", "node")
	    .attr("transform", function(d) { return "translate(" + d.y + "," + d.x + ")"; })
	
	node.append("circle")
		.attr("fill", "#fff")
		.attr("stroke", "steelblue")
		.attr("stroke-width", "1.5px")	    
	    .attr("r", noderadius);

	node.append("text")
	    .attr("dx", function(d) { return d.children ? -8 : 8; })
	    .attr("dy", 3)
    	.attr("font-family", "Helvetica")
    	.attr("font-size", "10px")
	    .attr("text-anchor", function(d) { return d.children ? "end" : "start"; })
	    .text(function(d) { return d.name; });

}
 
app.convertFreemindNodes = function (json) {

	var travel = function (node, out) {
		if(node["_TEXT"]) {
			out.name = node["_TEXT"]; //.replace(/&#(\d+);/g, function(match, number){ return String.fromCharCode(number); });
		}
		if(node["_LINK"]) {
			out.url = node["_LINK"];
		}
		if(node.node && node.node.length) {
			out.children = [];
			for(var i = 0; i < node.node.length; i++) {
				var child = {}
				child = travel(node.node[i], child);
				out.children.push(child);
			}
		}
		return out;
	}

	var tree = {};
	tree = travel(json.map.node, tree);

	console.log("Converted Tree: ", tree);

	return tree;

}

function removeElement(el) {
	el.parentNode.removeChild(el);
}