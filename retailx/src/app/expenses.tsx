import React, { useState } from 'react';
import { FlatList } from 'react-native';
import { Empty, Field, IconButton, ListItem, Muted, NumField, Button, Screen, Sheet, T, DateField } from '../ui/kit';
import { useApp } from '../ctx/AppContext';
import { useSession } from '../ctx/Session';
import { Repo } from '../db/repo';
import { useLoad } from '../lib/hooks';
import { todayStr } from '../lib/dates';
import { Fmt } from '../lib/format';
import { errKey } from '../lib/errors';

export default function Expenses() {
  const { t, toast, confirm, lang } = useApp();
  const { staff, can } = useSession();
  const [list, reload] = useLoad(() => Repo.listExpenses(), []);
  const [f, setF] = useState<{ category: string; amount: string; note: string; date: string } | null>(null);
  const save = async () => {
    if (!f) return;
    try { await Repo.saveExpense({ category: f.category.trim() || 'General', amount: Number(f.amount), note: f.note, date: f.date, staffId: staff?.id ?? null }); setF(null); toast(t('saved'), 'success'); reload(); }
    catch (e) { toast(t(errKey(e).key), 'error'); }
  };
  if (!can('expense.manage')) return <Screen back title={t('expensesTitle')}><Muted center style={{ marginTop: 40 }}>{t('featureLocked')}</Muted></Screen>;
  return (
    <Screen back title={t('expensesTitle')} scroll={false} right={<IconButton icon="add" onPress={() => setF({ category: '', amount: '', note: '', date: todayStr() })} />}>
      {list && !list.length ? <Empty icon="wallet-outline" title={t('noExpenses')} /> : (
        <FlatList data={list || []} keyExtractor={(e) => String(e.id)} contentContainerStyle={{ paddingBottom: 30 }}
          renderItem={({ item: e }) => (
            <ListItem title={e.category} sub={e.note || undefined} sub2={Fmt.date(e.date, lang, true)} trail={<T bold>{Fmt.money(e.amount)}</T>}
              onPress={async () => { if (await confirm(t('deleteExpenseMsg'), { danger: true, okLabel: t('delete') })) { await Repo.deleteExpense(e.id); reload(); } }} />
          )} />
      )}
      <Sheet visible={!!f} onClose={() => setF(null)} title={t('addExpense')} scroll>
        {f ? <>
          <Field label={t('category')} value={f.category} onChangeText={(v) => setF({ ...f, category: v })} />
          <NumField label={t('amount')} value={f.amount} onChangeText={(v) => setF({ ...f, amount: v })} />
          <DateField label={t('date')} value={f.date} onChange={(v) => setF({ ...f, date: v })} />
          <Field label={t('note')} value={f.note} onChangeText={(v) => setF({ ...f, note: v })} />
          <Button icon="checkmark" label={t('saveChanges')} onPress={save} />
        </> : null}
      </Sheet>
    </Screen>
  );
}
