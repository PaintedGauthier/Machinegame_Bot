// this should create bots as fast as possible,
// then quadrant search for castles
// it remembers castles for "data.castle_timeout" turns
// if it sees enemies near known castles, or the castle hasnt been seen for a while it 
// will send more and more bots to that location

// white_list for players you dont want to attack.
//
var white_list = {
	tofuink: true
};  

var data = {
	init: false,
	danger_distance: 5,
	living: {},
	average: 0,
	castle_bots: {},
	total_bots: 0,
	castle_timeout: 1000,
	castle_lookup: [],
	current_castle: 0,
	worry_about_castles_at: 100,
	min_wrench_dist: 150,
	collector_attack_mod: 2,
	collector_tick_mod: 2,
	current_center: {x:0, y:0},
	range_r: 300,
	last_turn: 0,
	last_focal: {x:0, y:0},
	focal_point: {x:0, y:0},
	focal_shift: 90,
	// the random radius move if cant find wrench
	r: 5000,
	modr: 63
};
 
var move = {x:0,y:0};
var d = 0;
function distance(a, b) { if (a.x == b.x && a.y == b.y) return 0; return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)); };
//function between(min, max) { return Math.round(data.rnd[min%data.rnd.length] * (max - min) + min); };
function between(min, max) { return Math.floor(Math.random() * (max - min) + min); };
function is_same(a, b) { return a.x == b.x && a.y == b.y; };
function is_near(a, b) { return (a.x == b.x || a.x == b.x + 1 || a.x == b.x - 1) && (a.y == b.y || a.y == b.y + 1 || a.y == b.y - 1); };


function move_in_range(bot) {
	if (bot.spent)
		return;
	//console.log('move_in_range');
	
	var modx = bot.id % data.modr;
	//if (data.turn % 1000) 
	//	data.modr = between(40, 65);
	
	if (data.danger_castles.length > 0 && modx > 35) {
		
		var castle_data = data.danger_castles[bot.id % data.danger_castles.length];
		
		// defenders
		if (modx > 55) {
			// have some flutter around the worrysome area.
			var dist = data.danger_distance + 1;
			move.x = between(castle_data.c.x - dist, castle_data.c.x + dist);
			move.y = between(castle_data.c.y - dist, castle_data.c.y + dist);
		} else {
			// send most of the bots on the castle
			move.x = castle_data.c.x;
			move.y = castle_data.c.y;
		}
		
	} else if (data.castle_lookup.length > 0 && modx > 30 && modx < 40) {
		
		// if we have castle (send some, or some plus the defenders)
		// castle fliers
		var c = data.castle_lookup[bot.id % data.castle_lookup.length];
		
		var r = 100;//between(100, 150);
		var t = between(20, r);
		move.x = c.c.x + r * Math.cos(t);
		move.y = c.c.y + r * Math.sin(t);
		//console.log('o2');
		
	} else {
		
		if (data.turn % data.focal_shift == 0 && data.turn != data.last_turn) {
	
			data.last_turn = data.turn;
			data.last_focal = data.focal_point;
			
			
			//if (data.others.length > 0) {// && data.turn % 3 == 0) {
			//	var other_bot = data.others[Math.floor(Math.random()*data.others.length)];
			//	data.focal_point.x = other_bot.x;
			//	data.focal_point.y = other_bot.y;
			//	
			//} else {
				//var shift_range = data.focal_shift + (data.focal_shift * .2);
				data.focal_point.x = between(0, data.focal_shift);
				data.focal_point.y = between(0, data.focal_shift);
				console.log('new focal', data.focal_point);
			    /*
				if (data.last_focal.x > 0 && data.focal_point.x > 0)
					data.focal_point.x = -data.focal_point.x;
				else if (data.last_focal.x < 0 && data.focal_point.x < 0)
					data.focal_point.x = -data.focal_point.x;
				if (data.last_focal.y > 0 && data.focal_point.y > 0)
					data.focal_point.y = -data.focal_point.y;
				else if (data.last_focal.y < 0 && data.focal_point.y < 0)
					data.focal_point.y = -data.focal_point.y;
				*/
		//	}
			
		}
		
		// get close to  focal
		var r = between(10, 50);
		var t = between(0, r);
		move.x = Math.abs(data.focal_point.x + r * Math.cos(t));
		move.y = Math.abs(data.focal_point.y + r * Math.sin(t));
		var bm = bot.id % 4;
		if (bm == 0) { }
		else if (bm == 1) {
			move.y = -move.y;
		}
		else if (bm == 2) {
			move.x = -move.x;
			move.y = -move.y;
		}
		else if (bm == 3) {
			move.x = -move.x;
		}
		move.x = data.current_center.x + move.x;
		move.y = data.current_center.y + move.y;
	}
	
	bot.spent = true;
	bot.moveTo(move);

};

function check_attack(state, bot, is_castle) {
	//console.log('check_attack');
	
	if (bot.spent) {
		return false;
	}
	
	var closest_other = false;
	for (var mx = state.others.length -1; mx >= 0; --mx) {
		
		var other = state.others[mx];
		if (other.wrenches == 0)
			continue;
		d = distance(bot, other);
		
		if (d <= 1) {
			bot.attack(other);
			other.wrenches--;
			bot.spent = true;
			return true;
		}
		
	}
	
	return false;
	
}

function renew_castle_data(state) {
	//console.log('renew_castle_data');

	for (var i = 0; i < state.castles.length; ++i) {
		var cdata = false;
		for (var m = 0; m < data.castle_lookup.length; ++m) {
			var mdata = data.castle_lookup[m];
			if (is_same(state.castles[i], mdata.c)) {
				cdata = mdata;
				break;
			}
		}
		if (!cdata) {
			cdata = {
				c: state.castles[i],
				bots_per_castle: 3,
				support: 0,
				time_since_enemy: 0,
				enemies: 0,
				bots: [],
				lookup: {}
			};
			data.castle_lookup.push(cdata);
		}
		cdata.timeout = data.castle_timeout;
		cdata.visible = true;
		
	}
}


function try_build_bot(state, bot) {
	if (bot.spent)
		return;
	//console.log('try_build_bot');
	
	if (data.total_bots < 256 && bot.wrenches >= 3) {
		data.total_bots++;
		bot.build();
		bot.spent = true;
		return true;
	}
	return false;
}
function pick_castles_and_enjoy(state) {
	
	if (data.castle_lookup.length == 0)
		return;
	
	if (data.total_bots <= data.worry_about_castles_at)
		return;
	
	if (data.current_castle >= data.castle_lookup.length){
		data.current_castle = 0;
	}

	var castle_data = data.castle_lookup[data.current_castle];
	var castle = castle_data.c;
	if (castle_data.bots.length < castle_data.bots_per_castle + castle_data.support) {
		var available = [];
		var closest_b = false;
		var closest_d = 999999;
		for (var i = 0; i < state.bots.length; ++i) {
			var bot = state.bots[i];
			if (bot.spent || bot.wrenches < 5) 
				continue;
			// old code
			var dist = distance(bot, castle_data.c);
			if (dist < closest_d) {
				var is_close = true;
				for (var m = 0; m < castle_data.bots.length && is_close; ++m) {
					var cbot = castle_data.bots[m];
					if (bot.id == cbot.id)
						is_close = false;
				}
				if (is_close) {
					closest_d = dist;
					closest_b = bot;
				}
			}
			
		}
		if (closest_b)
			castle_data.bots.push(closest_b);
	}
	data.current_castle++;
	
	if (data.current_castle >= data.castle_lookup.length){
		data.current_castle = 0;
	}
	castle_data = data.castle_lookup[data.current_castle];
	castle = castle_data.c;
	
	for (var i = 0; i < castle_data.bots.length; ++i) {
		var bot = data.living[castle_data.bots[i].id];
		if (bot === undefined)
			continue;
		bot.moveTo({x:bot.x + 1, y:bot.y + 1});
		bot.spent = true;
	}
}

function move_to_castle(state) {
	//console.log('move_to_castle');
	var stat = {
		winners: 0,
		spent: 0,
		moveto: 0,
		dead: 0 
	}
	var help_castles = [];
	for (var i = data.castle_lookup.length - 1; i >= 0; --i) {
		
		var castle_data = data.castle_lookup[i];
		castle_data.bots_on = 0;
		var castle = castle_data.c;
		while (castle_data.bots.length > castle_data.bots_per_castle + castle_data.support)
			castle_data.bots.pop()
	
		
		for (var m = castle_data.bots.length - 1; m >= 0; --m) {
			var bot = castle_data.bots[m];
			if (bot.id in data.living) {
				
				var passed_bot = data.living[bot.id];
				
				if (is_same(passed_bot, castle)) {
					stat.winners++;
					castle_data.bots_on++;
					castle_data.visible = true;
					if (check_attack(state, passed_bot, true)) {
						//console.log('bot attack castle', passed_bot);
						castle_data.support++;
					//} else if (data.rnd[(m-1)%data.rnd.length] > .4)
					} else if (Math.random() > .4)
						move_in_range(bot);
					else {
						castle_data.support = Math.max(0, castle_data.support - 1);
					}
					
				} else {
					stat.moveto++;
					passed_bot.moveTo(castle);
				}
				passed_bot.spent = true;
				
			} else {
				castle_data.bots.splice(i, 1);
				stat.dead++;
			}
		}
		
		if (castle_data.bots_on > 0 && castle_data.timeout < data.castle_timeout) {
			castle_data.timeout = 0;
			data.castle_lookup.splice(i, 1);
		} else {
			
			if (!castle_data.visible) {
				castle_data.support++;
				//console.log(castle, 'not visible');
				continue;
			}
			castle_data.enemies = 0;
			for (var v = 0; v < state.others.length; ++v) {
				if (distance(state.others[v], castle) > data.danger_distance)
					continue;
				castle_data.enemies++;
			}
			if(castle_data.enemies > 0) {
				help_castles.push(castle_data);
				castle_data.time_since_enemy = 0;
			} else {
				castle_data.time_since_enemy++;
			}
			//console.log(castle, 'enemies', castle_data.enemies, castle_data.time_since_enemy);
		}
	}
	data.danger_castles = help_castles;
}

function castle_cleanup() {
	//console.log('castle_cleanup');
	for (var i = data.castle_lookup.length - 1; i >= 0; --i) {
		var cdata = data.castle_lookup[i];
		
		if (data.castle_lookup[i].timeout-- < 0)
			data.castle_lookup.splice(i, 1);
		else {
			//console.log(cdata);
			if (cdata.time_since_enemy > 30) {
				cdata.bots_per_castle = 2;
				cdata.support = 0;
			}
			else if (cdata.time_since_enemy > 20)
				cdata.bots_per_castle = 3;
			else if (cdata.time_since_enemy > 10)
				cdata.bots_per_castle = 5;
			else 
				cdata.bots_per_castle = 10;
		}
	}
}

function remove_friends(state) {
	//console.log('remove_friends');
	var others = [];
	for (var i = state.others.length - 1; i >= 0; --i) {
		var other = state.others[i];
		if (other.user in white_list)
			continue;
		others.push(other);
	}
	state.others = others;
}

function find_center(state) {
	
	if (state.turn % 20 != 0)
		return;
	
	var map_center = {x:0, y:0};
	for (var i = 0; i < data.castle_lookup.length; ++i) {
		map_center.x += data.castle_lookup[i].c.x;
		map_center.y += data.castle_lookup[i].c.y;
	}
	map_center.x = Math.floor(map_center.x / data.castle_lookup.length);
	map_center.y = Math.floor(map_center.y / data.castle_lookup.length);
	data.current_center = map_center;
}

function play(state){
	//var t0 = performance.now();
	data.total_bots = state.bots.length;
	data.turn = state.turn;
	remove_friends(state);
	data.others = state.others;
	
	// reset all the crap, it will spike the time
	// however the sudden burst of everyone looking for castles seems to help
	if (state.turn % 10015 == 0) 
		for (var i = 0; i < data.castle_lookup.length; ++i) {
			data.castle_lookup[i].bots = [];
			data.castle_lookup[i].lookup = {};
		}
	
	renew_castle_data(state);
	find_center(state);
	
	data.living = {};
	
	for (var i = state.bots.length - 1; i >= 0; --i) {
		var bot = state.bots[i];
		
		bot.spent = false;
		data.living[bot.id] = bot;
		
		if (check_attack(state, bot, false))
			continue;
		
		if (try_build_bot(state, bot))
			continue;
	}
	move_to_castle(state);
		
	for (var i = 0; i < state.bots.length; ++i) {
		var bot = state.bots[i];
		if (bot.spent || bot.wrenches >= 5) continue;
		var closest_w = false;
		var closest_d = 99999;
		var closest_i = -1;
		for (var m = 0; m < state.wrenches.length; ++m) {
			var wrench = state.wrenches[m];
			var dist = distance(bot, wrench);
			if (dist < closest_d){
				closest_w = wrench;  
				closest_d = dist; 
				closest_i = i;
			} 
		}
		
		if (!closest_w) continue;
		
		var wrench = closest_w;
		if (wrench.x == bot.x && wrench.y == bot.y)
			bot.collect();
		else if (!check_attack(state, bot, false))
			bot.moveTo(wrench);

		wrench.x = 9999999;
		wrench.y = 9999999;
		bot.spent = true;

	}

	
	if (data.init)
		pick_castles_and_enjoy(state);
	else if (data.castle_lookup.length > 0) {
		for (var i = 0; i < data.castle_lookup.length; ++i)
			pick_castles_and_enjoy(state);
		data.init = true;
	}
	
	castle_cleanup();
	
	for (var i = 0; i < state.bots.length; ++i)
		move_in_range(state.bots[i]);
	
}
