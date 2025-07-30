<?php
	$dir = __DIR__ . '/backups';
	$files = glob($dir . '/indexeddb_backup_*.json');
	
	if (!$files) {
		echo json_encode(['status' => 'no_backup']);
		exit;
	}
	
		// Sort files by modification time, descending
	usort($files, function($a, $b) {
		  return filemtime($b) - filemtime($a);
		  });
	
	$latest = basename($files[0]);
	$timestamp = filemtime($files[0]);
	
	echo json_encode([
					 'status' => 'ok',
					 'filename' => $latest,
					 'timestamp' => $timestamp
					 ]);

