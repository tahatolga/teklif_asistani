import { Button, Group, Stack, TextInput, Textarea, Title } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../../lib/api";
import { showError, showSuccess } from "../../lib/errors";
import { tr } from "../../lib/i18n/tr";
import type { CustomerInput } from "../../types";

const empty: CustomerInput = {
  name: "", contact_person: "", email: "", phone: "",
  address: "", tax_office: "", tax_no: "", notes: "",
};

export function CustomerForm() {
  const { id } = useParams<{ id?: string }>();
  const nav = useNavigate();
  const [loading, setLoading] = useState(false);
  const form = useForm<CustomerInput>({
    initialValues: empty,
    validate: {
      name: (v) => (v.trim() ? null : `${tr.customer.name} ${tr.common.required}`),
    },
  });

  useEffect(() => {
    if (id) {
      api.getCustomer(id).then((c) => form.setValues({
        name: c.name, contact_person: c.contact_person,
        email: c.email, phone: c.phone, address: c.address,
        tax_office: c.tax_office, tax_no: c.tax_no, notes: c.notes,
      })).catch(showError);
    }
  }, [id]);

  const submit = form.onSubmit(async (values) => {
    setLoading(true);
    try {
      if (id) {
        await api.updateCustomer(id, values);
      } else {
        await api.createCustomer(values);
      }
      showSuccess("Kaydedildi");
      nav("/customers");
    } catch (err) { showError(err); }
    finally { setLoading(false); }
  });

  return (
    <Stack>
      <Title order={2}>
        {id ? tr.customer.editTitle : tr.customer.newTitle}
      </Title>
      <form onSubmit={submit}>
        <Stack>
          <TextInput label={tr.customer.name} required
            {...form.getInputProps("name")} />
          <Group grow>
            <TextInput label={tr.customer.contact}
              {...form.getInputProps("contact_person")} />
            <TextInput label={tr.customer.phone}
              {...form.getInputProps("phone")} />
          </Group>
          <TextInput label={tr.customer.email}
            {...form.getInputProps("email")} />
          <Textarea label={tr.customer.address} autosize minRows={2}
            {...form.getInputProps("address")} />
          <Group grow>
            <TextInput label={tr.customer.taxOffice}
              {...form.getInputProps("tax_office")} />
            <TextInput label={tr.customer.taxNo}
              {...form.getInputProps("tax_no")} />
          </Group>
          <Textarea label={tr.customer.notes} autosize minRows={2}
            {...form.getInputProps("notes")} />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => nav("/customers")}>
              {tr.common.cancel}
            </Button>
            <Button type="submit" loading={loading}>
              {tr.common.save}
            </Button>
          </Group>
        </Stack>
      </form>
    </Stack>
  );
}
