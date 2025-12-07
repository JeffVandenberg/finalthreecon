CREATE TABLE `dayparts` (
                            `id` varchar(36) NOT NULL,
                            `name` varchar(100) NOT NULL,
                            `start_date` datetime NOT NULL,
                            `dayname` varchar(25) NOT NULL,
                            PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
