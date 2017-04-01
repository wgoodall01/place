#!/usr/bin/env bash

sqlite3 "place.sqlite3" <<!
.headers on
.mode csv
.output export-$(date +"%Y_%m_%d_%I_%M_%p").csv
select * from place;
!
