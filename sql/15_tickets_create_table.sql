create table tickets
(
    id            varchar(36) not null,
    badge_id      varchar(36) not null,
    event_id      varchar(36) not null,
    relationships text        not null,
    constraint tickets_pk
        primary key (id),
    key (badge_id),
    key (event_id, badge_id)
);