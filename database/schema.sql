-- Reference PostgreSQL DDL. Apply Alembic for normal setup.

CREATE TABLE annotations (
	id VARCHAR NOT NULL, 
	timestamp VARCHAR NOT NULL, 
	data JSON NOT NULL, 
	PRIMARY KEY (id)
)

;


CREATE TABLE experiments (
	id VARCHAR NOT NULL, 
	timestamp VARCHAR NOT NULL, 
	data JSON NOT NULL, 
	PRIMARY KEY (id)
)

;


CREATE TABLE roles (
	id VARCHAR NOT NULL, 
	PRIMARY KEY (id)
)

;


CREATE TABLE sensors (
	id VARCHAR NOT NULL, 
	name VARCHAR NOT NULL, 
	type VARCHAR NOT NULL, 
	enabled BOOLEAN NOT NULL, 
	data JSON NOT NULL, 
	PRIMARY KEY (id)
)

;


CREATE TABLE simulation_scenarios (
	id VARCHAR NOT NULL, 
	data JSON NOT NULL, 
	PRIMARY KEY (id)
)

;


CREATE TABLE system_metrics (
	id SERIAL NOT NULL, 
	timestamp VARCHAR NOT NULL, 
	data JSON NOT NULL, 
	PRIMARY KEY (id)
)

;

CREATE INDEX ix_system_metrics_timestamp ON system_metrics (timestamp);


CREATE TABLE tracks (
	id VARCHAR NOT NULL, 
	class_name VARCHAR NOT NULL, 
	status VARCHAR NOT NULL, 
	first_seen VARCHAR NOT NULL, 
	last_seen VARCHAR NOT NULL, 
	data JSON NOT NULL, 
	PRIMARY KEY (id)
)

;

CREATE INDEX ix_tracks_last_seen ON tracks (last_seen);


CREATE TABLE zones (
	id VARCHAR NOT NULL, 
	name VARCHAR NOT NULL, 
	data JSON NOT NULL, 
	PRIMARY KEY (id)
)

;


CREATE TABLE alerts (
	id VARCHAR NOT NULL, 
	severity VARCHAR NOT NULL, 
	timestamp VARCHAR NOT NULL, 
	type VARCHAR NOT NULL, 
	message TEXT NOT NULL, 
	track_id VARCHAR, 
	sensor_id VARCHAR, 
	zone_id VARCHAR, 
	acknowledged BOOLEAN NOT NULL, 
	muted BOOLEAN NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(track_id) REFERENCES tracks (id), 
	FOREIGN KEY(sensor_id) REFERENCES sensors (id), 
	FOREIGN KEY(zone_id) REFERENCES zones (id)
)

;

CREATE INDEX ix_alerts_timestamp ON alerts (timestamp);


CREATE TABLE camera_sources (
	id VARCHAR NOT NULL, 
	protocol VARCHAR NOT NULL, 
	endpoint TEXT NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(id) REFERENCES sensors (id)
)

;


CREATE TABLE detections (
	id VARCHAR NOT NULL, 
	sensor_id VARCHAR NOT NULL, 
	track_id VARCHAR, 
	timestamp VARCHAR NOT NULL, 
	data JSON NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(sensor_id) REFERENCES sensors (id), 
	FOREIGN KEY(track_id) REFERENCES tracks (id)
)

;

CREATE INDEX ix_detections_sensor_id ON detections (sensor_id);

CREATE INDEX ix_detections_timestamp ON detections (timestamp);


CREATE TABLE events (
	id VARCHAR NOT NULL, 
	timestamp VARCHAR NOT NULL, 
	track_id VARCHAR, 
	type VARCHAR NOT NULL, 
	data JSON NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(track_id) REFERENCES tracks (id)
)

;

CREATE INDEX ix_events_timestamp ON events (timestamp);


CREATE TABLE sensor_measurements (
	id SERIAL NOT NULL, 
	sensor_id VARCHAR NOT NULL, 
	timestamp VARCHAR NOT NULL, 
	data JSON NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(sensor_id) REFERENCES sensors (id)
)

;

CREATE INDEX ix_sensor_measurements_timestamp ON sensor_measurements (timestamp);

CREATE INDEX ix_sensor_measurements_sensor_id ON sensor_measurements (sensor_id);


CREATE TABLE track_points (
	id SERIAL NOT NULL, 
	track_id VARCHAR NOT NULL, 
	timestamp VARCHAR NOT NULL, 
	x FLOAT NOT NULL, 
	y FLOAT NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(track_id) REFERENCES tracks (id)
)

;

CREATE INDEX ix_track_points_timestamp ON track_points (timestamp);

CREATE INDEX ix_track_points_track_id ON track_points (track_id);


CREATE TABLE users (
	id VARCHAR NOT NULL, 
	password TEXT NOT NULL, 
	role VARCHAR NOT NULL, 
	enabled BOOLEAN NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(role) REFERENCES roles (id)
)

;