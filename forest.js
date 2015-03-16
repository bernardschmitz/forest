/*globals google ctx */
/*eslint-env browser */

function log(s) {

	var r = document.getElementById('log');
	r.textContent += '\n'+s;
}

function clearLog() {
	var r = document.getElementById('log');
	r.textContent = '';
}


function makeGrid(w, h, size) {
	
	var grid = {
		size : size,
		width : w,
		height : h,
		cw : w / size,
		ch : h / size,
		items : [],
		grid : [],

		init : function() {

			for(var x=0; x<this.cw; x++) {
				this.grid[x] = [];
				for(var y=0; y<this.ch; y++) {
					this.grid[x][y] = [];
				}
			}			
		},

		addCircle : function(circle) {
			
//			this.items.push(circle);			
			this.getCellContaining(circle[0], circle[1]).push(circle);
		},
		
		getCell : function(cx, cy) {
			return this.grid[cx][cy];
		},
		
		getCellContaining : function(x, y) {

			var cx = Math.floor(x*this.cw/this.width);
			var cy = Math.floor(y*this.ch/this.height);
			return this.getCell(cx, cy);
		}
	};
	
	grid.init();
	
	return grid;
}



function circleOverlap(c0, c1) {

	var dx = c0[0] - c1[0];
	var dy = c0[1] - c1[1];
	var r  = c0[2] + c1[2];
	var d2 = dx*dx + dy*dy;

	return d2 < r*r;
}


function circleOverlapsAnyOtherCircle(circle, circles) {

	for(var i=0; i<circles.length; i++) {

		if(circleOverlap(circle, circles[i]))
			return true;
	}

	return false;
}

function placeCircleWithoutOverlap(circles, r, w, h) {

	var attempts = 1000;
	
	do {
		var circle = [ Math.random()*w, Math.random()*h, r ];
		
		attempts--;
		if(attempts === 0) {
			throw new Error('Unable to place non-overlapping circle');
		}
	}
	while(circleOverlapsAnyOtherCircle(circle, circles));

	return circle;
}

function generateForest(woodDensity, radius, w, h) {

	var trees = [];

	while(trees.length*Math.PI*radius*radius < w*h*woodDensity ) {

		try {
			var tree = placeCircleWithoutOverlap(trees, radius, w, h);
			trees.push(tree);	
		}
		catch(err) {
			log(err.message);
			var d = trees.length*Math.PI*radius*radius*100/(w*h);
			log('Halting forest generation. Actual density: '+d.toPrecision(4)+'%');
			return trees;
		}
	}					

	return trees;
}


function generatePerson(trees, w, h) {

	return placeCircleWithoutOverlap(trees, 2, w, h);
}

function drawPerson(ctx, person, color) {

	ctx.beginPath();
	ctx.arc(person[0], person[1], person[2], 0, 2*Math.PI);
	ctx.fillStyle = color;
	ctx.fill();
}

function drawCircle(ctx, x, y, r, c, fill) {	

	ctx.beginPath();
	ctx.arc(x, y, r, 0, 2*Math.PI);
	if(fill) {
		ctx.fillStyle = c;
		ctx.fill();		
	}
	else {
		ctx.strokeStyle = c;
		ctx.stroke();		
	}
}


function drawTrees(ctx, trees, color) {

	for(var i=0; i<trees.length; i++) {
		drawCircle(ctx, trees[i][0], trees[i][1], trees[i][2], color, false);
	}
}

function drawSightLine(ctx, from, to, color) {
	ctx.beginPath();
	ctx.strokeStyle = color;
	ctx.moveTo(from[0], from[1]);
	ctx.lineTo(to[0], to[1]);
	ctx.stroke();
}

function distance(from, to) {

	var dx = to[0] - from[0];
	var dy = to[1] - from[1];

	return Math.sqrt(dx*dx+dy*dy);
}

function distancePointLine(point, from, to) {

	var dx = to[0] - from[0];
	var dy = to[1] - from[1];

	var d = Math.sqrt(dx*dx+dy*dy);

	return Math.abs(dy*point[0] - dx*point[1] + to[0]*from[1] - to[1]*from[0]) / d;
	
}


function canSee(from, to, trees) {

	var left = Math.min(from[0], to[0]);
	var right = Math.max(from[0], to[0]);
	var top = Math.min(from[1], to[1]);
	var bottom = Math.max(from[1], to[1]);

	//console.log(from, to, left, right, top, bottom);

	for(var i=0; i<trees.length; i++) {

		var p = trees[i];
		var r = p[2];

		//console.log(p);

//		drawCircle(ctx, p[0], p[1], r, 'green', true);

		if(p[0] >= left-r && p[0] <= right+r && p[1] >= top-r && p[1] <= bottom+r) {
			
//			drawCircle(ctx, p[0], p[1], r, 'yellow', true);
			
			var d = distancePointLine(p, from, to); 
			//console.log(d);
			if(d < trees[i][2]) {
//				drawCircle(ctx, p[0], p[1], r, 'blue', true);				
				return false;
			}
		}
	}

	return true;
}


function runOneTest(draw, density, radius, ctx, width, height) {


	if(draw) {
		ctx.fillStyle = 'white';
		ctx.fillRect(0,0,width,height);
	}
		
	var forest = generateForest(density, radius, width, height);

	var personA = generatePerson(forest, width, height);
	var personB = generatePerson(forest, width, height);
	
	var see = canSee(personA, personB, forest);

	if(draw) {

		drawTrees(ctx, forest, 'black');	
		drawPerson(ctx, personA, 'blue');
		drawPerson(ctx, personB, 'green');

		if(see)
			drawSightLine(ctx, personA, personB, 'green');
		else
			drawSightLine(ctx, personA, personB, 'red');
	}

	return [see, distance(personA, personB)];
}



function runSightTests(draw, N, density, radius, ctx, width, height, done) {

	var results = [];

	var tests = N;

	var runTests = function() {

		tests--;

		if(tests >= 0) {
			
			try {
				results.push(runOneTest(draw, density, radius, ctx, width, height));
			}
			catch(err) {
				log(err.message);
				log('Unable to place person, skipping this trial.');
			}
			
			setTimeout(runTests, 0);
		}
		else {
			done(results);
		}
	};


	if(draw)
		runTests();
	else {

		for(var i=0; i<N; i++) {
			try {
				results.push(runOneTest(draw, density, radius, ctx, width, height));
			}
			catch(err) {
				log(err.message);
				log('Unable to place person, skipping this trial.');
			}
		}

		done(results);
	}
}


function drawHistogram(data) {

	var qq1 = [['Distance']];
	var qq2 = [['Distance']];

	for(var i=0; i<data.length; i++) {
		if(data[i][0]) 
			qq1.push([data[i][1]]);
		else
			qq2.push([data[i][1]]);

	}

	var q = google.visualization.arrayToDataTable(qq1);
	var chart1 = new google.visualization.Histogram(document.getElementById('seen_chart'));
	chart1.draw(q, { title: 'Seen', legend : { position: 'none'} });


	var q2= google.visualization.arrayToDataTable(qq2);
	var chart2 = new google.visualization.Histogram(document.getElementById('not_seen_chart'));
	chart2.draw(q2, { title: 'Not Seen', legend : { position: 'none'} });

}


function displayResults(results) {

	var seen = 0;
	for(var i=0; i<results.length; i++) {
		if(results[i][0]) {
			seen++;
		}
	}

	var percent = seen*100/results.length;

	var s = 'Friend seen '+percent.toPrecision(3)+'%';
	log(results.length+' trials');
	log(s);

	var r = document.getElementById('results');
	r.innerHTML = s;

	log('Simulation done.');

	setTimeout(function() {
		log('Drawing histograms.');
		drawHistogram(results);
	},0);
	
}


function run() {

	clearLog();
	log('Starting simulation...');

	var density = parseFloat(document.getElementById('density').value);
	var radius = parseInt(document.getElementById('radius').value, 10);
	var N = parseInt(document.getElementById('N').value, 10);
	var draw = document.getElementById('draw').checked;

	var r = document.getElementById('results');
	r.innerHTML = 'Friend seen --.-%';

	var width = 800;
	var height = 600;
	
	ctx.fillStyle = 'white';
	ctx.fillRect(0,0,width,height);

	setTimeout(function() {
		runSightTests(draw, N, density, radius, ctx, width, height, displayResults);		
	},0);



}
