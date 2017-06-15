var server = require('diet');
var request = require("request");
var cheerio = require('cheerio');
var each = require('async-each-series');

var app = server();
app.listen('http://wavemeup.ru:3030');

app.get('/', function($) {
	$.end('Hello World!')
})

var convertCloudiness = function(string) {
	switch(string) {
		case 'sun':
			return 0;
			break;
		case 'sunc':
			return 1;
			break;
		case 'suncl':
			return 2;
			break;
		case 'dull':
			return 3;
			break;
	}
}

app.get('/api/getCurrentWeather', function(res) { // текущая температура
	var api_key = 'f3c30de4eb40e123019515fb447e5465';
	request.get({url: 'http://api.openweathermap.org/data/2.5/weather?q=Saint Petersburg&units=metric&APPID='+api_key}, function(error, response, html) {
		var data = JSON.parse(html);
		var obj = {
			state: data.weather[0].main,
			temp: data.main.temp,
			pressure: data.main.pressure
		}
		res.json(obj);
	})
})

app.post('/api/getWeatherData', function(res) { // years - количество годов, day (необязательно) - день месяца
	// var year = res.body.year;
	// var month = res.body.month;
	var years = res.body.years;
	var day = res.body.day;

	var current_month = new Date().getMonth() + 1;
	var mas = [];

	if (!years) {
		res.error('description', 'Years argument not provided')
		res.failure();
	}
	for (var i=1; i<=years; i++) {
		mas.push(new Date().getFullYear()-i);
	}

	var object = {
		day: day ? day : new Date().getDate(),
		month: current_month,
		data: []
	}

	mas.forEach(function(year, index) {
		request.get({url: 'https://www.gismeteo.ru/diary/4079/' + year + "/" + current_month}, function(error, response, html) {
			if (!error && response.statusCode == 200) {
				var $ = cheerio.load(html);
				var temps = []
				$("tbody").eq(0).children("tr").each(function(index, item) {
					var temp = $(item).children("td").eq(1).text();
					var pressure = $(item).children("td").eq(2).text();
					var cloudiness = $(item).children("td").eq(3).children("img").eq(0).attr('src');
					cloudiness = cloudiness.slice(35,cloudiness.length).split('.')[0];
					var state = $(item).children("td").eq(4).children("img").eq(0).attr('src');
					state = state ? state.slice(35, state.length).split('.')[0] : null;
					temps.push({
						day: index+1,
						cloudiness: convertCloudiness(cloudiness),
						state: state,
						temp: temp,
						pressure: pressure
					})
				})
				var current_day = day ? day : new Date().getDate();
				object.data.push({
					year: year,
					cloudiness: temps[current_day-1].cloudiness,
					state: temps[current_day-1].state,
					temp: temps[current_day-1].temp,
					pressure: temps[current_day-1].pressure
				})
				if (object.data.length == years) {
					res.json(object);
				}
			} else {
				res.error('description', 'Weather not available')
				res.failure();
			}
		})
	})
})