var Abril = (typeof Abril == 'undefined') ? {} : Abril;
Abril.DAY = 86400000;

if(typeof String.prototype.right == 'undefined') {
	String.prototype.right = function(size) {
		if(size > this.length) return this;
		if(size < 1) return "";
		return this.substring(this.length - size);
	}
}

if(typeof Date.prototype.midnight == 'undefined') {
	Date.prototype.midnight = function() {
		return new Date(this.getFullYear(), this.getMonth(), this.getDate());
	}
}

Date.prototype.toBr = function() {
	return this.getDate() + '/' + (this.getMonth() + 1) + '/' + this.getFullYear();
}

Date.prototype.toExcel = function() {
	return this.getFullYear() + '/' + (this.getMonth() + 1) + '/' + this.getDate();
}

if(typeof Date.prototype.addDay == 'undefined') {
	Date.prototype.addDay = function(quantity) {
		var nextDate = new Date(this.getTime() + (quantity * Abril.DAY));

		return nextDate;
	}
}

if(typeof Date.prototype.nextDay == 'undefined') {
	Date.prototype.nextDay = function() {
		return this.addDay(1);
	}
}

if(typeof Date.prototype.previousDay == 'undefined') {
	Date.prototype.previousDay = function() {
		return this.addDay(-1);
	}
}

if(typeof Date.prototype.isWeekend == 'undefined') {
	Date.prototype.isWeekend = function() {
		return this.getDay() == 0 || this.getDay() == 6
	}
}

if(typeof Date.prototype.previousWorkingDay == 'undefined') {
	Date.prototype.previousWorkingDay = function() {
		var previousDate = this.previousDay();

		while(previousDate.isWeekend())
			previousDate = previousDate.previousDay();

		return previousDate;
	}
}

if(typeof Date.prototype.nextWorkingDay == 'undefined') {
	Date.prototype.nextWorkingDay = function() {
		var nextDate = this.nextDay();

		while(nextDate.isWeekend())
			nextDate = nextDate.nextDay();

		return nextDate;
	}
}

if(typeof Date.prototype.upTo == 'undefined') {
	Date.prototype.upTo = function(firstDate, callback) {
		var actualDate = this;

		while( actualDate <= firstDate ) {
			callback.call(this, actualDate);
			actualDate = actualDate.nextWorkingDay();
		}
	}
}

if(typeof Date.prototype.downTo == 'undefined') {
	Date.prototype.downTo = function(lastDate, callback) {
		var actualDate = this;

		while( actualDate >= lastDate ) {
			callback.call(this, actualDate);
			actualDate = actualDate.previousWorkingDay();
		}
	}
}

if(typeof Array.prototype.each == 'undefined') {
	Array.prototype.each = function(callback) {
		if(this.length == 0) return;
		if(typeof callback != 'function') throw "No callback given";

		for(var i = 0; i < this.length; i++) {
			var retorno = callback.call(this, this[i], i);
			if(typeof retorno == 'boolean' && !retorno)
				break;
		}
	}
}

if(typeof Array.prototype.filter == 'undefined') {
	Array.prototype.filter = function(callback) {
		if(this.length == 0) return;
		if(typeof callback != 'function') throw "No callback given";

		var retorno = [];
		for(var i = 0; i < this.length; i++) {
			if(callback.call(this, this[i], i))
			retorno.push(this[i]);
		}

		return retorno;
	}
}

if(typeof Array.prototype.first == 'undefined') {
	Array.prototype.first = function() {
		if(this.length == 0) return null;
		
		return this[0];
	}
}

if(typeof Array.prototype.last == 'undefined') {
	Array.prototype.last = function() {
		if(this.length == 0) return null;
		
		return this[this.length-1];
	}
}

if(typeof Array.prototype.find == 'undefined') {
	Array.prototype.find = function(callback) {
		if(this.length == 0) return -1;
		
		for(var i = 0; i < this.length; i++) {
			if(callback(this[i]))
				return i;
		}
		
		return -1;
	}
}

Abril.Debugger = function(level) {
	var DEBUG = 0;
	var TRACE = 1;
	var INFO = 2
	var WARN = 3;
	var ERROR = 4;

	this.level = level;

	this.debug = function(text) {
		if(this.level > DEBUG) return;

		console.log(text);

		return this;
	}

	this.info = function(text) {
		if(level > INFO) return;

		console.log(text);

		return this;
	}

	this.trace = function(text) {
		if(level > TRACE) return;

		console.log(text);

		return this;
	}

	this.warn = function(text) {
		if(level > WARN) return;

		console.log(text);

		return this;
	}

	this.error = function(text) {
		if(level > ERROR) return;

		console.log(text);

		return this;
	}
}

Abril.Debugger.DEBUG = 0;
Abril.Debugger.TRACE = 1;
Abril.Debugger.INFO = 2
Abril.Debugger.WARN = 3;
Abril.Debugger.ERROR = 4;
Abril.TODAY = new Date().midnight();