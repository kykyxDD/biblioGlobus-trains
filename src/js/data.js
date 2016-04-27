!function() {

var self = window.model = {
	info     : SEATS_INFO_URL,
	locfile  : LOCALE_URL,
	config   : CONFIG_URL.replace('.xml', '.json'),
	backup   : {},
	onready  : [],
	pixel    : new Image,

	_expose: function(name) {
		return function(data) {
			self[name] = data
		}
	},
	loadConfig: function(fail_callback) {
		self.get = new Loader
		self.get.json(self.config,  self._expose('planes'))
		self.get.xml (self.locfile, self._expose('locale'))
		self.get.xml (self.info,    self._expose('ticket'))

		self.get.ready(function() {
			if('ERROR' in self.ticket) {
				var error = self.locale.error.select('code', self.ticket['ERROR'])
				fail_callback(error)
			} else {
				var pre = decodeURIComponent(REGISTRATION_NUMBER),
					uid = C.DEMO ? pre : self.ticket[Const.tripInfoTag][Const.typeTag] || pre,
					plane = self.planes['planes'].select('uid', uid)

				if(plane) self.loadModel(plane)
				else fail_callback(new Error(uid +' is not a valid tour id'))
			}
		})
	},
	loadModel: function(plane) {
		self.airline =
			/^EK/.test(plane.uid) ? 'emirates' :
			/^QR/.test(plane.uid) ? 'qatar'    :
			'transaero'

		self.name = plane['model']

		self.get.json(BASE_URL + plane.config, self._expose('struct'))

		self.get.ready(self.processData)
	},
    processData: function() {
        self.home = BASE_URL +'resources/'+ self.struct['path']

        var left = 0;
        
        self.struct.seats = self.make_seats()
        
        self.struct['seats'].some(function(seat) {
            seat.sid = seat['type']
            seat.num = seat['id'].toUpperCase()
            seat.ref = self.planes['seat_types'][seat.sid].img.ref
            seat.sc_name = self.planes['seat_types'][seat.sid].name
        })

        ;[].concat(
            self.struct.map.color,
            self.struct.map.gray,
            self.struct.masks,
            self.struct.seats
        ).some(function(img) {
            img.sprite = self.struct['sprite']['info'][img.ref]
        })

        // 1x1 transparent
        self.pixel.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAAXNSR0IArs4c6QAAAAtJREFUCB1jYGAAAAADAAFPSAqvAAAAAElFTkSuQmCC'

        self.struct.plane.decks.some(self.collectDeckTiles)
        self.downloadImages(self.struct)
        self.collectBoardInfo()
        self.applyTRS(self.ticket)
    },
	applyTRS: function(data) {
		var users = [].concat(data['PASSENGERS']['PASSENGER']),
			types = Object.keys(self.planes['seat_types']),
			taken = []

		self.group_ticket = data['PASSENGERS']['GROUPBOARDINGPASS']

		users.some(function(data) {
			if(data['IS_INF'] || data['PARENTID']) {
				data.parent = users.select('ID', data['PARENTID'])
				if(!data.parent.child) data.parent.child = ko.observableArray();
				data.parent.child.push(data)
			}
		})
		self.users = users.map(function(data, index) {
			var user = {
				id        : data['ID'],
				age       : +data['AGE'],
				sex       : data['SEX'].toLowerCase(),
				disabled  : data['DISABLED'] && data['DISABLED']['MESSAGE'] || '',
				message   : data['MESSAGE'],
				title     : data['TITLE'],
				ticket    : data['BOARDINGPASS'],
				error     : data['ERROR'],
				sc        : data['SC'],

				parent    : data.parent,
				child     : data.child ? data.child : ko.observableArray(),
				infant	  : data['IS_INF'],
				name      : (data['NAME'] +' '+ data['SURNAME']).toLowerCase(),
				fclass    : self.locale['flightClass'+ data['SC']] || 'n/a',
				role 	  : data['PARENTID'] ? data['IS_INF'] ? "младенец" : "ребенок" : "взрослый",

				curseat   : '',
				face      : {}
			}

			var seat = data['CURSEAT'] ? data['CURSEAT'].toUpperCase() : ''
			if(seat) if(~taken.indexOf(seat)) {
				console.warn('Passenger #'+ index +' has seat '+ seat +' already taken by other passenger, voiding')
			} else {
				user.curseat = seat
				taken.push(seat)
			}

			types.map(function(type) {
				user.face[type] = self.selectPassenger(type, user)
			})

			if(C.DEMO) {
				user.curseat = ''
			}

			return user
		})
		self.users.some(function(user) {
			if(user.parent){ 
				user.parent = self.users.select('id', user.parent.ID)
			}
			
			if(user.child) {
				var childs = user.child();
				childs.forEach(function(data, index){
					childs[index] = self.users.select('id', data.ID)
				})
			}
		})

		data['SEATS']['SEAT'].forEach(function(info, index) {
			var arr = data['SEATS']['SEAT'].slice(0, index);
			var duplicate = arr.select('no', info['no'].toUpperCase());

			var seat = self.struct['seats'].select('num', info['no'].toUpperCase())
			if(seat && !duplicate) {
				var mock = { child: !rand(20), age: rand(100), sex: 'mf'[rand(2)] }
				var back = seat.back || self.selectPassenger(seat.sid, mock)
                var status = info['status'].toLowerCase()
				var free = status === '*' || status === 'i'
				var user = self.users.select('curseat', seat.num)

				var face =
					C.DEMO ? null                :
					user   ? user.face[seat.sid] :
					free   ? null                :
					         back

				seat.user = face

				seat.back = back
				seat.sc   = info['sc']
				seat.sex  = info['sex'].toLowerCase() || false;
                seat.status = status
                seat.has_child_cradle = status === 'i'
			} else if(duplicate){
				console.log('Повторение значения места: ', info['no'])
			}
		})

		self.users.forEach(function(user) {
			var seat = self.struct['seats'].select('num', user.curseat)
			if(!seat && user.curseat) {
				console.warn('Passenger has seat '+ user.curseat +', absent in JSON struct, voiding')
				user.curseat = ''
			}
		})
	},
	seatRequest: function(done, fail) {

        var schemas = {
            hash: {},
            collect: function(car) {
                if (car) {
                    hash[car.num] = car.schema
                }
            },
            toString: function() {
                var arr = []
                for (var car_num in hash) {
                    arr.push('schema' + car_num + "=" + hash[car_num])
                }
                return arr
            }
        }
        
		var seats = self.users.map(function(user) {
			var seat = user.curseat().toUpperCase()
            
			var add = []
			if(user.parent){
				add = ['c'+user.id, user.parent.id]
			} else if(user.child) {
				add[0] = 'p' + user.id;
				var arr = []
				user.child().forEach(function(child){
					arr.push(child.id)
				})
				add[1] = arr.join(',')
			}
	
			if(seat) {
                
                var seat_data = self.struct.seats.select('num', user.curseat())
                schemas.collect(seat_data.car)

				if(add.length){
					return [['n'+ user.id, seat].map(encodeURIComponent).join('='), add.map(encodeURIComponent).join('=')].join('&')	
				} else {
					return ['n'+ user.id, seat].map(encodeURIComponent).join('=')
				}
			}
		}).filter(Boolean).concat('platform=html5', schemas.toString()).join('&')

		var join = ~SEAT_REQUEST.indexOf('?') ? '&' : '?'
		self.get.xml(SEAT_REQUEST + join + seats,
		function(data) {
			if('ERROR' in data) {
				var error = self.locale.error.select('code', data['ERROR'])
				fail(error ? error.message : 'Unknown error')
			} else {
				self.compareTRS(data)
				self.applyTRS(data)

				done({
					head: self.locale['resultsPopupHeader'].replace('__val__', data[Const.tripInfoTag][Const.typeTag]),
					body: self.locale['resultsPopupText1']
				})
			}
		},
		function() {
			var error = self.locale.error.select('code', 0)
			fail(error.message)
		})
	},
	compareTRS: function(ticket) {
		;[].concat(ticket['PASSENGERS']['PASSENGER']).some(function(user) {
			var prev = self.users.select('id', user['ID'])

			if(prev) {
				var was = prev.curseat() && prev.curseat().toUpperCase(),
					now = user['CURSEAT'] && user['CURSEAT'].toUpperCase()

				if(was && !now) {
					user['ERROR'] = self.locale['registrationErrorText1'].replace('__val__', was)
				} else if (was !== now) {
					user['ERROR'] = self.locale['registrationErrorText2'].replace('__val__', was).replace('__val__', now)
				}

			} else {
				console.log('this shouldn\'t happen')
			}
		})
	},
	selectPassenger: function(sid, opt) {
		var type  = self.planes['seat_types'][sid]
		var crowd = type.people.filter(function(guy) {
				return !!opt.child == guy.child
					&&   opt.sex   == guy.sex
					&&   opt.age   >= guy.age[0]
					&&   opt.age   <= guy.age[1]
			})
		
        if (crowd.length > 0) {
            var image = crowd[rand(crowd.length)]
            return self.struct['sprite']['info'][image.ref]
        }
        else {
            console.log(sid, "image not found: child->", opt.child, "sex->", opt.sex, "age->", opt.age)
            return null
        }
	},
	collectBoardInfo: function() {
		var board = self.ticket[Const.tripInfoTag]
		self.boardinfo = {
			name          :self.name,
			date          :board['DATE'           ],
			num           :board['NUM'            ],
			boardnum      :board[Const.typeTag    ],
			boarding_time :board[Const.boardingTimeTag],
			takeoff_time  :board[Const.depatureTimeTag],
			from: {
				port      :board['AIRP_FROM'] ? "(" + board['AIRP_FROM'] + ")" : "",
				port_rus  :board[Const.depatureCityTag],
				city      :board['AIRPCITYEN_FROM']
			},
			to: {
				port      :board['AIRP_TO'] ? "(" + board['AIRP_TO'] + ")" : "",
				port_rus  :board[Const.arrivalCityTag],
				city      :board['AIRPCITYEN_TO'  ]
			}
		}
	},
	collectDeckTiles: function(deck) {
			var path = deck.tile_path_template
		    var car_w = deck.car_size[0]
            var car_h = deck.car_size[1]
            var overlap_w = deck.car_overlap_size[0]
            var overlap_h = deck.car_overlap_size[1]

            var cars = self.ticket.TRAIN.CAR
            var l = cars.length
            var hor_tiles_count = car_w*l - overlap_w*(l-1)
            var vert_tiles_count = car_h*l - overlap_h*(l-1)
            
            deck.tiles = [hor_tiles_count, vert_tiles_count]
            self.struct.plane.size = [hor_tiles_count*deck.width, vert_tiles_count*deck.height]
            self.struct.plane.point1 = [0, 0]
            self.struct.plane.point2 = [hor_tiles_count*deck.width, vert_tiles_count*deck.height]
                
            var tiles = []

            for (var i=0; i<hor_tiles_count; i++) {
                
                tiles[i] = []
                
                for (var j=0; j<vert_tiles_count; j++) {
                    tiles[i][j] = []
                }
            }

            for (var car_ind=0; car_ind<l; car_ind++) {
                
                var car = cars[car_ind]
                var tx = car_ind*(car_w-overlap_w)
                var ty = car_ind*(car_h-overlap_h)
                
                var ind = 0
                
                for (var b=0; b<car_h; b++) {
                     for (var a=0; a<car_w; a++) {
                        tiles[tx+a][ty+b].push({t: car.type, ind: ind++})
                    }
                }
            }

            var make_tile_obj = function(fname) {return { _url: self.home + path.replace("_name_", fname) } }
            var empty_tile = make_tile_obj("empty")
            
            deck.parts = []

            for (j=0; j<vert_tiles_count; j++) {
                
                for (i=0; i<hor_tiles_count; i++) {
                    
                    var tile = tiles[i][j]
                    if (tile.length == 0) {
                        deck.parts.push(empty_tile)
                    }
                    else if (tile.length == 1) {
                        var n = tile[0]
                        deck.parts.push(make_tile_obj(n.t + "_" + (n.ind > 9 ? n.ind : "0"+n.ind)))
                    }
                    else if (tile.length == 2) {
                        n = tile[0]
                        n2 = tile[1]
                        deck.parts.push(make_tile_obj(n.t + "_" + n2.t + "_" + {"0": "00", "1": "01", "6": "02", "7": "03"}[Math.min(n.ind, n2.ind)]))
                    }
                    
                    
                }
            }

			deck.load = false
	},
	downloadImages: function(stack) {
		var hosts = {}

		!function iterate(tree) {
			var leaf, image, url

			for(leaf in tree) if(leaf = tree[leaf]) if('object' === typeof leaf) {
				url = leaf['url'] || leaf['src']
				if(url && leaf['load'] !== false) {
					url = self.home + url
					if(hosts[url]) {
						hosts[url].push(leaf)
					} else {
						hosts[url] = [leaf]
						self.get.image(url, imageLoaded, imageFailed)
					}
				} else iterate(leaf)
			}
		}(stack)

		self.get.progress(self.resourcesProgress)
		self.get.ready(self.resourcesLoaded)

		function imageLoaded(image, url) {
			hosts[url].some(function(host) {
				host.width    = image.width
				host.height   = image.height
				host.image    = image
			})
		}
		function imageFailed(error, url) {
			hosts[url].some(function(host) {
				host.width  = self.pixel.width
				host.height = self.pixel.height
				host.image  = self.pixel
			})
			console.log(error, url)
		}
	},
	makeSpritePart: function(part) {
		var canvas = document.createElement('canvas')
		canvas.width  = part.w
		canvas.height = part.h
		canvas.getContext('2d').drawImage(self.struct.sprite.image,
			part.x, part.y, part.w, part.h,
			     0,      0, part.w, part.h)
		return canvas
	},
	makeImageCanvas: function(image) {
		var canvas = document.createElement('canvas')
		canvas.width  = image.width
		canvas.height = image.height
		canvas.getContext('2d').drawImage(image, 0, 0)
		return canvas
	},
    make_seats: function() {
        var seats = []
        var cars = self.ticket.TRAIN.CAR
        
        var left = 1437
        var top = 810
        
        for (var i=0; i<cars.length; i++) {
            var car = cars[i]
            var cfg = self.planes.bus_parts[car.type]
            for (var j=0; j<cfg.seat_positions.length; j++) {
                var pos = cfg.seat_positions[j]
                num = Math.max(pos.deck)
                var seat = {
                    deck: pos.deck,
                    car: car,
                    id: car.num + "-" + pos.no,
                    type: pos.type,
                    x: pos.x + left,
                    y: pos.y + top,
                    name: pos.no
                }
                seats.push(seat)
            }

            left += cfg.right.x - cfg.left.x
            top += cfg.right.y - cfg.left.y

        }
        
        return seats
    },
	resourcesProgress: function() {},
	resourcesLoaded  : function() {}
}


}();
