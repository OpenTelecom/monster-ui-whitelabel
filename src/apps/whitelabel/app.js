define(function(require){
	var $ = require('jquery'),
		monster = require('monster'),
		toastr = require('toastr');

	var app = {
		name: 'whitelabel',

		css: [ 'app'],

		i18n: {
			'en-US': { customCss: false },
			'ru-RU': { customCss: false }
		},

		requests: {
			/*
			'google.getUser': {
				apiRoot: 'http://api.google.com/',
				url: 'users',
				verb: 'PUT'
			}*/
		},

		load: function(callback){
			var self = this;

			self.initApp(function() {
				callback && callback(self);
			});
		},

		vars: {},

		initApp: function(callback) {
			var self = this;

			monster.pub('auth.initApp', {
				app: self,
				callback: callback
			});

			self.initHandlebarsHelpers();
		},

		initHandlebarsHelpers: function() {
			Handlebars.registerHelper('inc', function(value, options) {
				return parseInt(value) + 1;
			});

			Handlebars.registerHelper('compare', function (lvalue, operator, rvalue, options) {
				var operators, result;

				if (arguments.length < 3) {
					throw new Error('Handlerbars Helper \'compare\' needs 2 parameters');
				}

				if (options === undefined) {
					options = rvalue;
					rvalue = operator;
					operator = '===';
				}

				operators = {
					'==': function (l, r) { return l == r; },
					'===': function (l, r) { return l === r; },
					'!=': function (l, r) { return l != r; },
					'!==': function (l, r) { return l !== r; },
					'<': function (l, r) { return l < r; },
					'>': function (l, r) { return l > r; },
					'<=': function (l, r) { return l <= r; },
					'>=': function (l, r) { return l >= r; },
					'typeof': function (l, r) { return typeof l == r; }
				};

				if (!operators[operator]) {
					throw new Error('Handlerbars Helper \'compare\' doesn\'t know the operator ' + operator);
				}

				result = operators[operator](lvalue, rvalue);

				if (result) {
					return options.fn(this);
				} else {
					return options.inverse(this);
				}

			});
		},

		render: function(_container) {
			var self = this,
				$container = _container || $('#monster_content');

			var html = $(monster.template(self, 'main', {}));
			$container.empty().append(html);
		}
	};

	return app;
});
