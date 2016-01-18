DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

INSERT INTO `users` (`id`, `name`) VALUES
	(1, 'Admin')
	;


DROP TABLE IF EXISTS `user_tokens`;
CREATE TABLE `user_tokens` (
  `user_id` int(11) NOT NULL,
  `token` varchar(32) NOT NULL DEFAULT '',
  PRIMARY KEY (`user_id`,`token`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

INSERT INTO `user_tokens` (`user_id`, `token`) VALUES
	(1, 'abcdef0123456789abcdef0123456789')
	;


DROP TABLE IF EXISTS `attributes`;
CREATE TABLE `attributes` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `device_id` varchar(32) NOT NULL DEFAULT '',
  `name` varchar(64) NOT NULL DEFAULT '',
  `order` int(4) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `device_id` (`device_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

INSERT INTO `attributes` (`id`, `device_id`, `name`, `order`) VALUES
	(1, '0000000000000001', 'attr1', 0)
	;


DROP TABLE IF EXISTS `converters`;
CREATE TABLE `converters` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `attribute_id` int(11) NOT NULL,
  `type` varchar(64) NOT NULL DEFAULT '',
  `value` varchar(256) NOT NULL DEFAULT '',
  `order` int(4) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `attribute_id` (`attribute_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

INSERT INTO `converters` (`id`, `attribute_id`, `type`, `value`, `order`) VALUES
	(1, 1, 'integer', '4', 0)
	;


DROP TABLE IF EXISTS `calibrators`;
CREATE TABLE `calibrators` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `attribute_id` int(11) NOT NULL,
  `fn` text NOT NULL,
  `order` int(4) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `attribute_id` (`attribute_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

INSERT INTO `calibrators` (`id`, `attribute_id`, `fn`, `order`) VALUES
	(1, 1, 'return value - 58.3', 0)
	;


DROP TABLE IF EXISTS `validators`;
CREATE TABLE `validators` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `attribute_id` int(11) NOT NULL,
  `type` varchar(64) NOT NULL DEFAULT '',
  `value` varchar(256) NOT NULL DEFAULT '',
  `order` int(4) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `attribute_id` (`attribute_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

INSERT INTO `validators` (`id`, `attribute_id`, `type`, `value`, `order`) VALUES
	(1, 1, 'min', '100', 0),
	(2, 1, 'max', '1300', 1)
	;
