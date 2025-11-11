<?php
// firecrew-agenda.php

header('Content-Type: application/json');

// Jouw Google Agenda iCal URL
$ical_url = "https://calendar.google.com/calendar/ical/df2fa36fb8ea4044f8276cf20d9922d6c350e7f7604bb5ad4a53521324f78727%40group.calendar.google.com/private-17d5bd8642d7c8b8e6f0e05b731579ac/basic.ics";

// Eenvoudige caching: sla JSON 10 minuten op
$cache_file = __DIR__ . "/firecrew-agenda.json";
$cache_time = 600; // 10 minuten in seconden

if(file_exists($cache_file) && (time() - filemtime($cache_file)) < $cache_time){
    echo file_get_contents($cache_file);
    exit;
}

// iCal ophalen
$ical = file_get_contents($ical_url);
if(!$ical){
    http_response_code(500);
    echo json_encode(["error"=>"Kon iCal feed niet ophalen"]);
    exit;
}

// Parse iCal
$events = [];
preg_match_all('/BEGIN:VEVENT(.*?)END:VEVENT/s', $ical, $matches);
foreach($matches[1] as $vevent){
    preg_match('/SUMMARY:(.*?)\r?\n/', $vevent, $title);
    preg_match('/DTSTART(?:;VALUE=DATE-TIME)?:([0-9T]+)/', $vevent, $start);
    preg_match('/DTEND(?:;VALUE=DATE-TIME)?:([0-9T]+)/', $vevent, $end);
    preg_match('/DESCRIPTION:(.*?)\r?\n/', $vevent, $desc);
    preg_match('/URL:(.*?)\r?\n/', $vevent, $url);

    $events[] = [
        "summary" => $title[1] ?? "Geen titel",
        "start" => isset($start[1]) ? date("c", strtotime($start[1])) : "",
        "end" => isset($end[1]) ? date("c", strtotime($end[1])) : "",
        "description" => $desc[1] ?? "",
        "url" => $url[1] ?? ""
    ];
}

// Opslaan in cache
file_put_contents($cache_file, json_encode($events));
echo json_encode($events);
