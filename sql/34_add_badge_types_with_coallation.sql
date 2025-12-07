create table badge_types
(
    id              varchar(36)  not null
        primary key,
    badge_type_name varchar(200) not null
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
