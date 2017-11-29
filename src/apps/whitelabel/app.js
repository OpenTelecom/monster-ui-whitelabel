define(function(require){
	var $ = require('jquery'),
		monster = require('monster');

	require([
		'fileupload'
	]);

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

			self.getWhiteLabelData(function(whitelabelData) {
				self.renderWhitelabelTab('general', whitelabelData);
			});

		},

		renderWhitelabelTab: function(tabKeyName, data) {
			var self = this;
			var $parent = $('#whitelabel-content');

			switch(tabKeyName) {
				case 'general':
					self.generalScreenRender(data, $parent);
					break;
				default:

			}

			monster.ui.tooltips($parent, {
				options: {
					placement: 'right',
					container: 'body'
				}
			});
		},

		generalScreenRender: function(data, $parent) {
			var self = this;

			$('.js-sidebar-menu-item').removeClass('active');
			$('#general-screen-link').addClass('active');

			var $html = $(monster.template(self, 'screen-general',
				$.extend(true, {
					i18n: self.i18n.active()
				}, data)
				));

			$parent.empty().append($html);

			if (data.doc) {
				if (data.doc.hasOwnProperty('custom_welcome_message')) {
					$parent.find("#custom_welcome_message").val(data.doc.custom_welcome_message);
				}
			}

			// TODO: Is this necessary?
			// self.ui.validate(template.find("#general-form"));

			self.generalScreenBindEvents($parent, data)
		},

		generalScreenBindEvents: function($parent, whitelabelData) {
			var self = this,
				allowedTypes = ['image/png', 'image/jpeg'],
				logo = null,
				icon = null;

			var resetLogo = function() {
				var $logoPreview = $parent.find('.logo-preview');
				var logoCSSurl = $logoPreview.data('original-logo') ? 'url(' + $logoPreview.data('original-logo') + ')' : '';
				if (logoCSSurl) {
					$logoPreview.css('background-image', logoCSSurl).toggleClass('empty', false);
				} else {
					$logoPreview.css('background-image', 'none').toggleClass('empty', true);
				}
				$parent.find('.js-reset-logo').hide();
				$parent.find('.logo-upload-div .file-upload input').val('');
				logo = null;
			};

			var resetFavicon = function() {
				var $faviconPreview = $parent.find('.favicon-preview');
				var faviconCSSurl = $faviconPreview.data('original-favicon') ? 'url(' + $faviconPreview.data('original-favicon') + ')' : '';
				if (faviconCSSurl) {
					$faviconPreview.css('background-image', faviconCSSurl).toggleClass('empty', false);
				} else {
					$faviconPreview.css('background-image', 'none').toggleClass('empty', true);
				}
				$parent.find('.js-reset-favicon').hide();
				$parent.find('.favicon-upload-div .file-upload input').val('');
				icon = null;
			};

			$parent.find('#company-logo').fileUpload({
				inputOnly : true,
				wrapperClass : 'file-upload input-append',
				btnClass : 'btn',
				mimeTypes : allowedTypes,
				success : function(data) {
					var imageObj = new Image;
					imageObj.onload = function(e) {
						if (this.width <= 192 && this.height <= 62) {
							$parent.find('.js-logo-preview').css('background-image', 'url(' + imageObj.src + ')').removeClass('empty');
							$parent.find('.js-reset-logo').show();
						} else {
							monster.ui.alert('error', self.i18n.active().whitelabel.alertMessages.logoWrongSize);
							resetLogo();
						}
					};
					logo = data[0].file;
					imageObj.src = data[0].file;
				},
				error : function(config) {
					if (config.hasOwnProperty('mimeTypes')) {
						if (config.mimeTypes.length > 0) {
							monster.ui.alert('error', self.i18n.active().whitelabel.alertMessages.logoWrongType);
						}
					}
					resetLogo();
				}
			});

			$parent.find('#company_icon_input').fileUpload({
				inputOnly : true,
				wrapperClass : 'file-upload input-append',
				btnClass : 'btn',
				success : function(data) {
					var imageObj = new Image;

					imageObj.onload = function(e) {
						if (this.width <= 64 && this.height <= 64) {
							$parent.find('.js-favicon-preview').css('background-image', 'url(' + imageObj.src + ')').removeClass('empty');
							$parent.find('.js-reset-favicon').show();
						} else {
							monster.ui.alert('error', self.i18n.active().alertMessages.faviconWrongSize);
							resetFavicon();
						}
					};
					icon = data[0].file;
					imageObj.src = data[0].file;
				},
				error : function(textStatus) {
					resetFavicon();
				}
			});

			$parent.find('.reset-logo').on('click', resetLogo);
			$parent.find('.reset-favicon').on('click', resetFavicon);
			$parent.find('#custom_welcome').on('change', function() {
				if ($(this).prop('checked')) {
					$parent.find('.welcome-message-container').slideDown();
				} else {
					$parent.find(".welcome-message-container").slideUp();
				}
			});

			$parent.find('form').on('submit', function(e){
				e.preventDefault();
				self.generalScreenFormSave($(this), whitelabelData, logo, icon);
			});

			$parent.find('.js-save').on('click', function(e) {
				var $form = $(this).closest('form');
				e.preventDefault();
				self.generalScreenFormSave($form, whitelabelData, logo, icon);

			});

			$parent.find('.js-remove').on('click', function() {
				monster.ui.confirm(data.i18n.active().alertMessages.deleteConfirm, function() {
					self.callApi({
						resource : 'whitelabel.delete',
						data : {
							accountId : data.accountId
						},
						success : function(textStatus) {
							self.render();
						},
						error : function(textStatus) {
							self.render();
						}
					});
				});
			});
		},

		generalScreenFormSave: function($form, whitelabelData, logo, icon) {
			var self = this;

			if(monster.ui.valid($form)) {

				// TODO: research next string
				var task = data.generalBrandingFormatData(self.ui.getFormData("general-form"), whitelabelData.doc);

				self.callApi({
					resource : whitelabelData.doc ? 'whitelabel.update' : 'whitelabel.create',
					data : {
						accountId : self.accountId,
						data : task
					},
					success : function(textStatus) {
						var obj = {};
						var callback = function() {
							self.render();
						};
						if(logo) {
							obj.logo = function(callback) {
								self.callApi({
									resource : 'whitelabel.updateLogo',
									data : {
										accountId : data.accountId,
										data : logo
									},
									success : function(feed) {
										callback(null, feed);
									},
									error : function(textStatus) {
										callback(null, textStatus);
									}
								});
							};
						}
						if(icon) {
							obj.icon = function(callback) {
								self.callApi({
									resource : 'whitelabel.updateIcon',
									data : {
										accountId : data.accountId,
										data : icon
									},
									success : function(feed) {
										callback(null, feed);
									},
									error : function(textStatus) {
										callback(null, textStatus);
									}
								});
							};
						}
						if ($.isEmptyObject(obj)) {
							callback();
						} else {
							self.parallel(obj, callback);
						}
					}
				});
			}
		},

		generalScreenFormatData: function(settings, opts) {
			settings.hide_powered = !settings.hide_powered;
			settings = $.extend(true, {}, opts, settings);

			if(settings.callReportEmail == '') {
				delete settings.callReportEmail
			}

			if(settings.language == 'auto') {
				delete settings.language
			}

			return settings;
		},

		getWhiteLabelData: function(callback) {
			var self = this;

			monster.parallel({
				doc: function (callback) {
					self.callApi({
						resource: 'whitelabel.get',
						data: {
							accountId: self.accountId,
							generateError: false
						},
						success: function (response) {
							callback(null, response.data);
						},
						error: function(textStatus) {
							if(typeof(callback) === 'function') {
								callback(null, null);
							}
						}
					});
				},
				logo: function (callback) {
					self.callApi({
						resource: 'whitelabel.getLogo',
						data: {
							accountId: self.accountId,
							generateError: false
						},
						success: function (response) {
							callback(null, response.data);
						},
						error: function(textStatus) {
							if(typeof(callback) === 'function') {
								callback(null, null);
							}
						}
					});
				},
				icon: function (callback) {
					self.callApi({
						resource: 'whitelabel.getIcon',
						data: {
							accountId: self.accountId,
							generateError: false,
							dataType : "*"
						},
						success: function (response) {
							callback(null, response.data);
						},
						error: function(textStatus) {
							if(typeof(callback) === 'function') {
								callback(null, null);
							}
						}
					});
				},
				passwordRecovery: function (callback) {
					self.callApi({
						resource: 'whitelabel.getNotification',
						data: {
							accountId: self.accountId,
							generateError: false,
							notificationId: 'password_recovery'
						},
						success: function (response) {
							callback(null, response.data);
						},
						error: function(textStatus) {
							if(typeof(callback) === 'function') {
								callback(null, null);
							}
						}
					});
				}
			}, function (err, results) {
				console.log('Results:');
				console.log(results);

				if (results.doc
					&& results.passwordRecovery
					&& results.passwordRecovery.enabled === false) {
					/** @type {boolean} */
					results.doc.hidePasswordRecovery = true;
				}

				delete results.passwordRecovery;

				if(typeof(callback) === 'function') {
					callback(results);
				}
			});
		}
	};

	return app;
});
