-- IECE Sistema de Gestão - Schema do Banco de Dados
-- Execute no Supabase SQL Editor

-- Extensão para UUIDs
create extension if not exists "uuid-ossp";

-- Tabela de usuários (beneficiados)
create table usuarios (
  id uuid primary key default uuid_generate_v4(),
  nome varchar(200) not null,
  cpf varchar(14) unique not null,
  rg varchar(20),
  data_nascimento date not null,
  titulo_eleitoral varchar(30),
  telefone varchar(20),
  whatsapp varchar(20),
  cep varchar(10),
  endereco varchar(200),
  numero varchar(10),
  complemento varchar(50),
  bairro varchar(100),
  cidade varchar(100),
  estado varchar(2),
  ativo boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Tabela de atendentes (funcionários)
create table atendentes (
  id uuid primary key default uuid_generate_v4(),
  nome varchar(200) not null,
  email varchar(200),
  telefone varchar(20),
  ativo boolean default true,
  created_at timestamptz default now()
);

-- Tabela de tipos de atendimento
create table tipos_atendimento (
  id uuid primary key default uuid_generate_v4(),
  descricao varchar(200) not null unique,
  ativo boolean default true,
  created_at timestamptz default now()
);

-- Tabela de origens de atendimento
create table origens_atendimento (
  id uuid primary key default uuid_generate_v4(),
  descricao varchar(200) not null unique,
  ativo boolean default true,
  created_at timestamptz default now()
);

-- Tabela de atendimentos
create table atendimentos (
  id uuid primary key default uuid_generate_v4(),
  usuario_id uuid not null references usuarios(id),
  atendente_id uuid references atendentes(id),
  tipo_id uuid references tipos_atendimento(id),
  origem_id uuid references origens_atendimento(id),
  observacoes text,
  data_atendimento timestamptz default now(),
  created_at timestamptz default now()
);

-- Tabela de eventos (fotos)
create table eventos (
  id uuid primary key default uuid_generate_v4(),
  titulo varchar(200) not null,
  descricao text,
  data_evento date,
  created_at timestamptz default now()
);

-- Tabela de fotos dos eventos
create table fotos_eventos (
  id uuid primary key default uuid_generate_v4(),
  evento_id uuid references eventos(id) on delete cascade,
  url_foto text not null,
  descricao varchar(200),
  created_at timestamptz default now()
);

-- Tabela de notificações enviadas (log)
create table notificacoes_log (
  id uuid primary key default uuid_generate_v4(),
  usuario_id uuid references usuarios(id),
  tipo varchar(50) not null, -- 'cadastro', 'aniversario', 'manual'
  canal varchar(20) not null, -- 'whatsapp', 'sms'
  numero_destino varchar(20),
  mensagem text,
  status varchar(20) default 'enviado', -- 'enviado', 'erro'
  erro_detalhe text,
  created_at timestamptz default now()
);

-- Tabela de configurações do sistema
create table configuracoes (
  chave varchar(100) primary key,
  valor text,
  descricao varchar(200),
  updated_at timestamptz default now()
);

-- Inserir configurações padrão
insert into configuracoes (chave, valor, descricao) values
  ('zapi_instance_id', '', 'ID da instância Z-API'),
  ('zapi_token', '', 'Token da Z-API'),
  ('zapi_client_token', '', 'Client token da Z-API'),
  ('msg_boas_vindas', 'Olá {nome}! 🎉 Bem-vindo(a) à IECE Guarulhos! Seu cadastro foi realizado com sucesso. Qualquer dúvida, estamos à disposição!', 'Mensagem de boas-vindas ao cadastrar'),
  ('msg_aniversario', 'Olá {nome}! 🎂 A equipe IECE Guarulhos deseja a você um feliz aniversário! Que este dia seja muito especial!', 'Mensagem de parabéns no aniversário'),
  ('enviar_wa_cadastro', 'true', 'Enviar WhatsApp ao realizar novo cadastro'),
  ('enviar_wa_aniversario', 'true', 'Enviar WhatsApp automático nos aniversários');

-- Inserir dados de exemplo
insert into origens_atendimento (descricao) values
  ('Presencial'), ('Telefone'), ('WhatsApp'), ('Site'), ('Indicação');

insert into tipos_atendimento (descricao) values
  ('Assistência Social'), ('Orientação Jurídica'), ('Esporte e Lazer'),
  ('Educação'), ('Saúde'), ('Documentação');

-- Índices para performance
create index idx_usuarios_cpf on usuarios(cpf);
create index idx_usuarios_nome on usuarios(nome);
create index idx_usuarios_nascimento on usuarios(data_nascimento);
create index idx_atendimentos_usuario on atendimentos(usuario_id);
create index idx_atendimentos_data on atendimentos(data_atendimento);
create index idx_notificacoes_usuario on notificacoes_log(usuario_id);

-- Função para atualizar updated_at automaticamente
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger usuarios_updated_at
  before update on usuarios
  for each row execute function update_updated_at();

-- RLS (Row Level Security) - habilitar para produção
alter table usuarios enable row level security;
alter table atendimentos enable row level security;
alter table atendentes enable row level security;
alter table tipos_atendimento enable row level security;
alter table origens_atendimento enable row level security;
alter table eventos enable row level security;
alter table fotos_eventos enable row level security;
alter table notificacoes_log enable row level security;
alter table configuracoes enable row level security;

-- Políticas: apenas usuários autenticados acessam
create policy "Autenticados podem ver tudo" on usuarios for all using (auth.role() = 'authenticated');
create policy "Autenticados podem ver tudo" on atendimentos for all using (auth.role() = 'authenticated');
create policy "Autenticados podem ver tudo" on atendentes for all using (auth.role() = 'authenticated');
create policy "Autenticados podem ver tudo" on tipos_atendimento for all using (auth.role() = 'authenticated');
create policy "Autenticados podem ver tudo" on origens_atendimento for all using (auth.role() = 'authenticated');
create policy "Autenticados podem ver tudo" on eventos for all using (auth.role() = 'authenticated');
create policy "Autenticados podem ver tudo" on fotos_eventos for all using (auth.role() = 'authenticated');
create policy "Autenticados podem ver tudo" on notificacoes_log for all using (auth.role() = 'authenticated');
create policy "Autenticados podem ver tudo" on configuracoes for all using (auth.role() = 'authenticated');
