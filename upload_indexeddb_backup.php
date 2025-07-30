<?php
	$data = file_get_contents('php://input');
	if (!$data) {
		http_response_code(400);
		echo "No input data.";
		exit;
	}
	
	$timestamp = date('Y-m-d_H-i-s');
	$filename = "indexeddb_backup_$timestamp.json";
	$dir = __DIR__ . '/backups';
	
	if (!is_dir($dir)) {
		mkdir($dir, 0755, true);
	}
	
	file_put_contents("$dir/$filename", $data);
	echo "Backup saved as $filename.";
	?>
